import json

import frappe
import requests
from erpnext.accounts.doctype.journal_entry.journal_entry import (
    get_payment_entry_against_invoice,
)
from erpnext.accounts.doctype.payment_entry.test_payment_entry import get_payment_entry
from frappe import _
from frappe.utils import cint, nowdate, validate_phone_number


def get_details(docname):
    details = frappe.db.get_value(
        "Sales Invoice", docname, ["name", "currency", "outstanding_amount"], as_dict=1
    )
    return details


def get_paystack_settings():
    # Get the first enabled Paystack gateway setting
    gateway_settings = frappe.get_all(
        "Paystack Gateway Setting", filters={"enabled": 1}, limit=1
    )

    if not gateway_settings:
        frappe.throw(
            _(
                "There is a problem with the payment gateway. Please contact the Administrator to proceed."
            )
        )

    settings = frappe.get_doc("Paystack Gateway Setting", gateway_settings[0].name)

    return {
        "public_key": settings.public_key,
        "secret_key": settings.get_password("secret_key"),
    }


def create_paystack_transaction(amount, currency, email, metadata=None):
    """
    Initialize a Paystack transaction
    """
    settings = get_paystack_settings()

    headers = {
        "Authorization": f"Bearer {settings['secret_key']}",
        "Content-Type": "application/json",
    }

    data = {
        "amount": int(amount) * 100,  # Paystack expects amount in kobo/cents
        "email": email,
        "currency": currency or "GHS",  # Default to GHS
        "reference": frappe.generate_hash(length=12),  # Generate unique reference
    }

    if metadata:
        data["metadata"] = metadata

    try:
        response = requests.post(
            "https://api.paystack.co/transaction/initialize", headers=headers, json=data
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        frappe.throw(
            _(
                "Error during payment initialization: {0} Please contact the Administrator."
            ).format(str(e))
        )


@frappe.whitelist()
def get_payment_options(doctype, docname, phone, currency=None):
    if not frappe.db.exists(doctype, docname):
        frappe.throw(_("Invalid document provided."))
    validate_phone_number(phone_number=phone, throw=True)
    details = get_details(docname)
    settings = get_paystack_settings()

    # Initialize Paystack transaction
    paystack_response = create_paystack_transaction(
        amount=details.outstanding_amount,
        currency=details.currency,
        email=frappe.session.user,
        metadata={"purpose": "fee_payment", "invoice": docname, "phone": phone},
    )

    if paystack_response.get("status") and paystack_response.get("data"):
        data = paystack_response["data"]
        options = {
            "key_id": settings["public_key"],
            "name": frappe.db.get_single_value("Website Settings", "app_name"),
            "description": _("Payment for {0} course").format(
                details["outstanding_amount"]
            ),
            "order_id": data["reference"],  # Paystack reference
            "amount": int(
                float(details.outstanding_amount) * 100
            ),  # Amount in kobo/cents
            "currency": data["currency"],
            "access_code": data["access_code"],  # For Paystack verification
            "prefill": {
                "name": frappe.db.get_value("User", frappe.session.user, "full_name"),
                "email": frappe.session.user,
                "contact": phone,
            },
        }
        return options
    else:
        frappe.throw(_("Failed to initialize payment transaction"))


def create_paystack_payment_record(args, status):
    payment_record = frappe.new_doc("Payment Record")
    payment_record.order_id = args.get("reference", "")  # Paystack reference
    payment_record.payment_id = args.get("id", "")  # Paystack transaction ID
    payment_record.signature = ""  # Paystack doesn't use signature in same way
    payment_record.against_invoice = args.get("against_invoice", "")
    payment_record.status = status
    payment_record.amount = (
        args.get("amount", 0) / 100 if args.get("amount") else 0
    )  # Convert from kobo
    if status == "Success":
        payment_record.student = args.get("metadata", {}).get("student_id", "")
        payment_record.mobile = args.get("metadata", {}).get("phone", "")
        payment_record.email = args.get("email", "")
        payment_record.address_line_1 = args.get("metadata", {}).get(
            "address_line_1", ""
        )
        payment_record.currency = args.get("currency", "")
        payment_record.address_line_2 = args.get("metadata", {}).get(
            "address_line_2", ""
        )
        payment_record.city = args.get("metadata", {}).get("city", "")
        payment_record.state = args.get("metadata", {}).get("state", "")
        payment_record.country = args.get("metadata", {}).get("country", "")
        payment_record.pincode = args.get("metadata", {}).get("pincode", "")
    if status == "Failed":
        payment_record.failure_description = args.get("gateway_response", {}).get(
            "message", ""
        )
    payment_record.save(ignore_permissions=True)
    return payment_record


@frappe.whitelist()
def handle_payment_success(response, against_invoice, billing_details):
    # Verify payment with Paystack
    settings = get_paystack_settings()

    headers = {
        "Authorization": f"Bearer {settings['secret_key']}",
        "Content-Type": "application/json",
    }

    # Verify the transaction using Paystack's verify endpoint
    reference = response.get("reference") or response.get("data", {}).get("reference")
    if not reference:
        frappe.throw(_("Invalid payment response: missing reference"))

    try:
        verify_response = requests.get(
            f"https://api.paystack.co/transaction/verify/{reference}", headers=headers
        )
        verify_response.raise_for_status()
        verification_data = verify_response.json()

        if (
            not verification_data.get("status")
            or verification_data["data"]["status"] != "success"
        ):
            frappe.throw(_("Payment verification failed"))

        # Check if already processed
        if frappe.db.exists(
            "Payment Record",
            {
                "order_id": reference,
                "status": "Success",
            },
        ):
            return

        payment_details = get_details(against_invoice)

        # Prepare arguments for payment record creation
        payment_args = {
            "reference": reference,
            "id": verification_data["data"].get("id", ""),
            "amount": verification_data["data"].get("amount", 0),
            "currency": verification_data["data"].get("currency", ""),
            "email": verification_data["data"].get("customer", {}).get("email", ""),
            "metadata": {
                "student_id": billing_details.get("id", ""),
                "phone": billing_details.get("mobile_number", ""),
                "address_line_1": billing_details.get("address_line_1", ""),
                "address_line_2": billing_details.get("address_line_2", ""),
                "city": billing_details.get("city", ""),
                "state": billing_details.get("state", ""),
                "country": billing_details.get("country", ""),
                "pincode": billing_details.get("pincode", ""),
            },
            "against_invoice": against_invoice,
        }

        payment_record = create_paystack_payment_record(payment_args, "Success")

        try:
            frappe.flags.ignore_account_permission = True
            pe = get_payment_entry("Sales Invoice", against_invoice)
            pe.reference_no = reference
            pe.reference_date = nowdate()
            pe.posting_date = nowdate()
            pe.save(ignore_permissions=True)
            pe.submit()

        except Exception as e:
            frappe.throw(_("Error during payment: {0}").format(e))

    except requests.exceptions.RequestException as e:
        frappe.throw(_("Error verifying payment with Paystack: {0}").format(str(e)))


@frappe.whitelist()
def handle_payment_failure(response, against_invoice, billing_details):
    # Handle Paystack payment failure
    # Paystack might return different error structures
    error_data = response
    if isinstance(response, dict) and "error" in response:
        error_data = response["error"]

    # Prepare arguments for payment record creation
    payment_args = {
        "reference": error_data.get("reference", ""),
        "id": error_data.get("id", ""),
        "amount": error_data.get("amount", 0),
        "currency": error_data.get("currency", ""),
        "email": error_data.get("customer", {}).get("email", ""),
        "gateway_response": error_data,  # Store full error response
        "metadata": {
            "student_id": billing_details.get("id", ""),
            "phone": billing_details.get("mobile_number", ""),
            "address_line_1": billing_details.get("address_line_1", ""),
            "address_line_2": billing_details.get("address_line_2", ""),
            "city": billing_details.get("city", ""),
            "state": billing_details.get("state", ""),
            "country": billing_details.get("country", ""),
            "pincode": billing_details.get("pincode", ""),
        },
        "against_invoice": against_invoice,
    }

    payment_record = create_paystack_payment_record(payment_args, "Failed")
