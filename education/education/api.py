# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import json

import frappe
from frappe import _
from frappe.email.doctype.email_group.email_group import add_subscribers
from frappe.model.mapper import get_mapped_doc
from frappe.utils import cstr, flt, getdate, today
from frappe.utils.dateutils import get_dates_from_timegrain


def get_course(program):
	courses = frappe.db.sql(
		"""select course, course_name from `tabProgram Course` where parent=%s""",
		(program),
		as_dict=1,
	)
	return courses


@frappe.whitelist()
def enroll_student(source_name):
	frappe.publish_realtime(
		"enroll_student_progress", {"progress": [1, 4]}, user=frappe.session.user
	)
	student = get_mapped_doc(
		"Student Applicant",
		source_name,
		{
			"Student Applicant": {
				"doctype": "Student",
				"field_map": {
					"name": "student_applicant",
				},
			}
		},
		ignore_permissions=True,
	)
	student.save()

	student_applicant = frappe.db.get_value(
		"Student Applicant",
		source_name,
		["student_category", "program", "academic_year", "academic_term"],
		as_dict=True,
	)
	program_enrollment = frappe.new_doc("Program Enrollment")
	program_enrollment.student = student.name
	program_enrollment.student_category = student_applicant.student_category
	program_enrollment.student_name = student.student_name
	program_enrollment.program = student_applicant.program
	program_enrollment.academic_year = student_applicant.academic_year
	program_enrollment.academic_term = student_applicant.academic_term
	program_enrollment.save()

	frappe.publish_realtime(
		"enroll_student_progress", {"progress": [2, 4]}, user=frappe.session.user
	)
	return program_enrollment


@frappe.whitelist()
def check_attendance_records_exist(course_schedule=None, student_group=None, date=None):
	if course_schedule:
		return frappe.get_list(
			"Student Attendance", filters={"course_schedule": course_schedule}
		)
	else:
		return frappe.get_list(
			"Student Attendance", filters={"student_group": student_group, "date": date}
		)


@frappe.whitelist()
def mark_attendance(
	students_present, students_absent, course_schedule=None, student_group=None, date=None
):
	if student_group:
		academic_year = frappe.db.get_value("Student Group", student_group, "academic_year")
		if academic_year:
			year_start_date, year_end_date = frappe.db.get_value(
				"Academic Year", academic_year, ["year_start_date", "year_end_date"]
			)
			if getdate(date) < getdate(year_start_date) or getdate(date) > getdate(
				year_end_date
			):
				frappe.throw(
					_("Attendance cannot be marked outside of Academic Year {0}").format(academic_year)
				)

	present = json.loads(students_present)
	absent = json.loads(students_absent)

	for d in present:
		make_attendance_records(
			d["student"], d["student_name"], "Present", course_schedule, student_group, date
		)

	for d in absent:
		make_attendance_records(
			d["student"], d["student_name"], "Absent", course_schedule, student_group, date
		)

	frappe.db.commit()
	frappe.msgprint(_("Attendance has been marked successfully."))


def make_attendance_records(
	student, student_name, status, course_schedule=None, student_group=None, date=None
):
	student_attendance = frappe.get_doc(
		{
			"doctype": "Student Attendance",
			"student": student,
			"course_schedule": course_schedule,
			"student_group": student_group,
			"date": date,
		}
	)
	if not student_attendance:
		student_attendance = frappe.new_doc("Student Attendance")
	student_attendance.student = student
	student_attendance.student_name = student_name
	student_attendance.course_schedule = course_schedule
	student_attendance.student_group = student_group
	student_attendance.date = date
	student_attendance.status = status
	student_attendance.save()
	student_attendance.submit()


@frappe.whitelist()
def get_student_guardians(student):
	guardians = frappe.get_all(
		"Student Guardian", fields=["guardian"], filters={"parent": student}
	)
	return guardians


@frappe.whitelist()
def get_student_group_students(student_group, include_inactive=0):
	if include_inactive:
		students = frappe.get_all(
			"Student Group Student",
			fields=["student", "student_name"],
			filters={"parent": student_group},
			order_by="group_roll_number",
		)
	else:
		students = frappe.get_all(
			"Student Group Student",
			fields=["student", "student_name"],
			filters={"parent": student_group, "active": 1},
			order_by="group_roll_number",
		)
	return students


@frappe.whitelist()
def get_fee_structure(program, academic_term=None):
	fee_structure = frappe.db.get_values(
		"Fee Structure",
		{"program": program, "academic_term": academic_term},
		"name",
		as_dict=True,
	)
	return fee_structure[0].name if fee_structure else None


@frappe.whitelist()
def get_fee_components(fee_structure):
	if fee_structure:
		fs = frappe.get_all(
			"Fee Component",
			fields=["fees_category", "description", "amount"],
			filters={"parent": fee_structure},
			order_by="idx",
		)
		return fs


@frappe.whitelist()
def get_fee_schedule(program, student_category=None):
	fs = frappe.get_all(
		"Program Fee",
		fields=["academic_term", "fee_schedule", "due_date", "amount"],
		filters={"parent": program, "student_category": student_category},
		order_by="idx",
	)
	return fs


@frappe.whitelist()
def collect_fees(fees, amt):
	paid_amount = flt(amt) + flt(frappe.db.get_value("Fees", fees, "paid_amount"))
	total_amount = flt(frappe.db.get_value("Fees", fees, "total_amount"))
	frappe.db.set_value("Fees", fees, "paid_amount", paid_amount)
	frappe.db.set_value("Fees", fees, "outstanding_amount", (total_amount - paid_amount))
	return paid_amount


@frappe.whitelist()
def get_course_schedule_events(start, end, filters=None):
	from frappe.desk.calendar import get_event_conditions

	conditions = get_event_conditions("Course Schedule", filters)

	data = frappe.db.sql(
		"""select name, course, color,
			timestamp(schedule_date, from_time) as from_time,
			timestamp(schedule_date, to_time) as to_time,
			room, student_group, 0 as 'allDay'
		from `tabCourse Schedule`
		where ( schedule_date between %(start)s and %(end)s )
		{conditions}""".format(
			conditions=conditions
		),
		{"start": start, "end": end},
		as_dict=True,
		update={"allDay": 0},
	)

	return data


@frappe.whitelist()
def get_assessment_criteria(course):
	return frappe.get_all(
		"Course Assessment Criteria",
		fields=["assessment_criteria", "weightage"],
		filters={"parent": course},
		order_by="idx",
	)


@frappe.whitelist()
def get_assessment_students(assessment_plan, student_group):
	student_list = get_student_group_students(student_group)
	for i, student in enumerate(student_list):
		result = get_result(student.student, assessment_plan)
		if result:
			student_result = {}
			for d in result.details:
				student_result.update({d.assessment_criteria: [cstr(d.score), d.grade]})
			student_result.update(
				{"total_score": [cstr(result.total_score), result.grade], "comment": result.comment}
			)
			student.update(
				{
					"assessment_details": student_result,
					"docstatus": result.docstatus,
					"name": result.name,
				}
			)
		else:
			student.update({"assessment_details": None})
	return student_list


@frappe.whitelist()
def get_assessment_details(assessment_plan):
	return frappe.get_all(
		"Assessment Plan Criteria",
		fields=["assessment_criteria", "maximum_score", "docstatus"],
		filters={"parent": assessment_plan},
		order_by="idx",
	)


@frappe.whitelist()
def get_result(student, assessment_plan):
	results = frappe.get_all(
		"Assessment Result",
		filters={
			"student": student,
			"assessment_plan": assessment_plan,
			"docstatus": ("!=", 2),
		},
	)
	if results:
		return frappe.get_doc("Assessment Result", results[0])
	else:
		return None


@frappe.whitelist()
def get_grade(grading_scale, percentage):
	grading_scale_intervals = {}
	if not hasattr(frappe.local, "grading_scale"):
		grading_scale = frappe.get_all(
			"Grading Scale Interval",
			fields=["grade_code", "threshold"],
			filters={"parent": grading_scale},
		)
		frappe.local.grading_scale = grading_scale
	for d in frappe.local.grading_scale:
		grading_scale_intervals.update({d.threshold: d.grade_code})
	intervals = sorted(grading_scale_intervals.keys(), key=float, reverse=True)
	for interval in intervals:
		if flt(percentage) >= interval:
			grade = grading_scale_intervals.get(interval)
			break
		else:
			grade = ""
	return grade


@frappe.whitelist()
def mark_assessment_result(assessment_plan, scores):
	student_score = json.loads(scores)
	assessment_details = []
	for criteria in student_score.get("assessment_details"):
		assessment_details.append(
			{
				"assessment_criteria": criteria,
				"score": flt(student_score["assessment_details"][criteria]),
			}
		)
	assessment_result = get_assessment_result_doc(
		student_score["student"], assessment_plan
	)
	assessment_result.update(
		{
			"student": student_score.get("student"),
			"assessment_plan": assessment_plan,
			"comment": student_score.get("comment"),
			"total_score": student_score.get("total_score"),
			"details": assessment_details,
		}
	)
	assessment_result.save()
	details = {}
	for d in assessment_result.details:
		details.update({d.assessment_criteria: d.grade})
	assessment_result_dict = {
		"name": assessment_result.name,
		"student": assessment_result.student,
		"total_score": assessment_result.total_score,
		"grade": assessment_result.grade,
		"details": details,
	}
	return assessment_result_dict


@frappe.whitelist()
def submit_assessment_results(assessment_plan, student_group):
	total_result = 0
	student_list = get_student_group_students(student_group)
	for i, student in enumerate(student_list):
		doc = get_result(student.student, assessment_plan)
		if doc and doc.docstatus == 0:
			total_result += 1
			doc.submit()
	return total_result


def get_assessment_result_doc(student, assessment_plan):
	assessment_result = frappe.get_all(
		"Assessment Result",
		filters={
			"student": student,
			"assessment_plan": assessment_plan,
			"docstatus": ("!=", 2),
		},
	)
	if assessment_result:
		doc = frappe.get_doc("Assessment Result", assessment_result[0])
		if doc.docstatus == 0:
			return doc
		elif doc.docstatus == 1:
			frappe.msgprint(_("Result already Submitted"))
			return None
	else:
		return frappe.new_doc("Assessment Result")


@frappe.whitelist()
def update_email_group(doctype, name):
	if not frappe.db.exists("Email Group", name):
		email_group = frappe.new_doc("Email Group")
		email_group.title = name
		email_group.save()
	email_list = []
	students = []
	if doctype == "Student Group":
		students = get_student_group_students(name)
	for stud in students:
		for guard in get_student_guardians(stud.student):
			email = frappe.db.get_value("Guardian", guard.guardian, "email_address")
			if email:
				email_list.append(email)
	add_subscribers(name, email_list)


@frappe.whitelist()
def get_current_enrollment(student, academic_year=None):
	compare_date = getdate(academic_year) if academic_year else getdate(today())

	program_enrollment_list = frappe.db.sql(
		"""
		SELECT
			pe.name AS program_enrollment, pe.student_name, pe.program, pe.student_batch_name AS student_batch,
			pe.student_category, pe.academic_term, pe.academic_year
		FROM
			`tabProgram Enrollment` pe
		JOIN
			`tabAcademic Year` ay ON pe.academic_year = ay.name
		WHERE
			pe.student = %s
			AND ay.year_end_date >= %s
		ORDER BY
			pe.creation
		""",
		(student, compare_date),
		as_dict=1,
	)

	if program_enrollment_list:
		return program_enrollment_list[0]
	else:
		return None


@frappe.whitelist()
def get_instructors(student_group):
	return frappe.get_all(
		"Student Group Instructor", {"parent": student_group}, pluck="instructor"
	)


@frappe.whitelist()
def get_user_info():
	if frappe.session.user == "Guest":
		frappe.throw("Authentication failed", exc=frappe.AuthenticationError)

	current_user = frappe.db.get_list(
		"User",
		fields=["name", "email", "enabled", "user_image", "full_name", "user_type"],
		filters={"name": frappe.session.user},
	)[0]
	current_user["session_user"] = True
	return current_user


@frappe.whitelist()
def get_student_info():
	import traceback
	email = frappe.session.user
	if email == "Administrator":
		return
	
	try:
		students = frappe.get_all(
			"Student",
			filters={"user": email},
			fields=["name"],
			pluck="name"
		)
		
		if not students:
			return None
		
		student = frappe.get_doc("Student", students[0])
		
		current_program = get_current_enrollment(student.name)
		
		student_groups = []
		if current_program:
			student_groups = get_student_groups(student.name, current_program.program)
		
		student_dict = student.as_dict()
		student_dict["current_program"] = current_program
		student_dict["student_groups"] = student_groups
		
		return student_dict
		
	except Exception as e:
		frappe.log_error(f"Error in get_student_info: {str(e)}\n{traceback.format_exc()}", "Student Info Error")
		raise


@frappe.whitelist()
def get_student_programs(student=None, **kwargs):
	if not student:
		return []
	programs = frappe.db.get_list(
		"Program Enrollment",
		fields=["program", "name"],
		filters={"docstatus": 1, "student": student},
		ignore_permissions=True,
	)
	return programs


def get_student_groups(student, program_name):
	student_group = frappe.qb.DocType("Student Group")
	student_group_students = frappe.qb.DocType("Student Group Student")

	student_group_query = (
		frappe.qb.from_(student_group)
		.inner_join(student_group_students)
		.on(student_group.name == student_group_students.parent)
		.select((student_group_students.parent).as_("label"))
		.where(student_group_students.student == student)
		.where(student_group.program == program_name)
		.run(as_dict=1)
	)

	return student_group_query


@frappe.whitelist()
def get_course_list_based_on_program(program_name):
	program = frappe.get_doc("Program", program_name)

	course_list = []

	for course in program.courses:
		course_list.append(course.course)
	return course_list


@frappe.whitelist()
def get_course_schedule_for_student(program_name=None, student_groups=None, **kwargs):
	if not program_name:
		frappe.log_error("Missing program_name", "Schedule Debug")
		return []
		
	group_names = []
	if student_groups and isinstance(student_groups, list) and len(student_groups) > 0:
		if isinstance(student_groups[0], str):
			group_names = student_groups
		else:
			group_names = [sg.get("label") for sg in student_groups]
	
	if group_names:
		schedule = frappe.db.get_list(
			"Course Schedule",
			fields=[
				"schedule_date",
				"room",
				"class_schedule_color",
				"course",
				"from_time",
				"to_time",
				"instructor",
				"title",
				"name",
			],
			filters={"program": program_name, "student_group": ["in", group_names]},
			order_by="schedule_date asc",
			ignore_permissions=True,
		)
	elif program_name:
		schedule = frappe.db.get_list(
			"Course Schedule",
			fields=[
				"schedule_date",
				"room",
				"class_schedule_color",
				"course",
				"from_time",
				"to_time",
				"instructor",
				"title",
				"name",
			],
			filters={"program": program_name},
			order_by="schedule_date asc",
			ignore_permissions=True,
		)
	else:
		schedule = []
	return schedule


@frappe.whitelist()
def apply_leave(leave_data, program_name):
	attendance_based_on_course_schedule = frappe.db.get_single_value(
		"Education Settings", "attendance_based_on_course_schedule"
	)
	if attendance_based_on_course_schedule:
		apply_leave_based_on_course_schedule(leave_data, program_name)
	else:
		apply_leave_based_on_student_group(leave_data, program_name)


def apply_leave_based_on_course_schedule(leave_data, program_name):
	course_schedule_in_leave_period = frappe.db.get_list(
		"Course Schedule",
		fields=["name", "schedule_date"],
		filters={
			"program": program_name,
			"schedule_date": [
				"between",
				[leave_data.get("from_date"), leave_data.get("to_date")],
			],
		},
		order_by="schedule_date asc",
	)
	if not course_schedule_in_leave_period:
		frappe.throw(_("No classes found in the leave period"))
	for course_schedule in course_schedule_in_leave_period:
		if not frappe.db.exists(
			"Student Attendance",
			{"course_schedule": course_schedule.get("name"), "docstatus": 1},
		):
			make_attendance_records(
				leave_data.get("student"),
				leave_data.get("student_name"),
				"Leave",
				course_schedule.get("name"),
				None,
				course_schedule.get("schedule_date"),
			)


def apply_leave_based_on_student_group(leave_data, program_name):
	student_groups = get_student_groups(leave_data.get("student"), program_name)
	leave_dates = get_dates_from_timegrain(
		leave_data.get("from_date"), leave_data.get("to_date")
	)
	for student_group in student_groups:
		for leave_date in leave_dates:
			make_attendance_records(
				leave_data.get("student"),
				leave_data.get("student_name"),
				"Leave",
				None,
				student_group.get("label"),
				leave_date,
			)


@frappe.whitelist()
def get_student_invoices(student=None, **kwargs):
	if not student:
		return {"invoices": [], "print_format": "Standard"}
	
	student_sales_invoices = []

	frappe.flags.in_student_invoices = student
	sales_invoice_list = frappe.db.sql("""
		SELECT name, status, student, due_date, fee_schedule, outstanding_amount, currency, grand_total, docstatus
		FROM `tabSales Invoice`
		WHERE student = %s
		AND docstatus IN (0, 1)
	""", (student,), as_dict=True)
	
	frappe.log_error(f"Student: {student}, Found {len(sales_invoice_list)} invoices", "Invoice Debug")
	
	if not sales_invoice_list:
		frappe.log_error(f"No invoices for student {student}", "Invoice Debug")
		return {"invoices": [], "print_format": "Standard"}
	
	for si in sales_invoice_list:
		frappe.log_error(f"Invoice: {si.name}, status: {si.status}, docstatus: {si.docstatus}", "Invoice Debug")
		# Handle NULL status - default to Unpaid for Draft invoices
		invoice_status = si.status if si.status else "Draft"
		if invoice_status not in ["Paid", "Unpaid", "Overdue", "Partly Paid", "Draft"]:
			frappe.log_error(f"Skipping invoice {si.name} - status not in list", "Invoice Debug")
			continue
			
		student_program_invoice_status = {}
		student_program_invoice_status["id"] = si.name
		student_program_invoice_status["status"] = invoice_status
		student_program_invoice_status["program"] = get_program_from_fee_schedule(
			si.fee_schedule
		)
		symbol = get_currency_symbol(si.get("currency", "INR"))
		student_program_invoice_status["amount"] = symbol + " " + str(si.outstanding_amount)
		student_program_invoice_status["invoice"] = si.name
		if invoice_status == "Paid":
			student_program_invoice_status["amount"] = symbol + " " + str(si.grand_total)
			student_program_invoice_status[
				"payment_date"
			] = get_posting_date_from_payment_entry_against_sales_invoice(si.name)
			student_program_invoice_status["due_date"] = "-"
		else:
			student_program_invoice_status["due_date"] = si.due_date
			student_program_invoice_status["payment_date"] = "-"

		student_sales_invoices.append(student_program_invoice_status)
		frappe.log_error(f"Added invoice: {si.name}", "Invoice Debug")

	print_format = get_fees_print_format() or "Standard"
	frappe.log_error(f"Returning {len(student_sales_invoices)} invoices", "Invoice Debug")

	return {"invoices": student_sales_invoices, "print_format": print_format}


def get_currency_symbol(currency):
	return frappe.db.get_value("Currency", currency, "symbol") or currency


def get_posting_date_from_payment_entry_against_sales_invoice(sales_invoice):
	payment_entry = frappe.qb.DocType("Payment Entry")
	payment_entry_reference = frappe.qb.DocType("Payment Entry Reference")

	q = (
		frappe.qb.from_(payment_entry)
		.inner_join(payment_entry_reference)
		.on(payment_entry.name == payment_entry_reference.parent)
		.select(payment_entry.posting_date)
		.where(payment_entry_reference.reference_name == sales_invoice)
	).run(as_dict=1)

	if len(q) > 0:
		payment_date = q[0].get("posting_date")
		return payment_date


def get_fees_print_format():
	return frappe.db.get_value(
		"Property Setter",
		dict(property="default_print_format", doc_type="Sales Invoice"),
		"value",
	)


def get_program_from_fee_schedule(fee_schedule):
	if not fee_schedule:
		return None
	
	program = frappe.db.get_value(
		"Fee Schedule", filters={"name": fee_schedule}, fieldname=["program"]
	)
	
	if not program:
		fs = frappe.get_doc("Fee Schedule", fee_schedule)
		if fs.student_groups:
			first_group = fs.student_groups[0].student_group
			program = frappe.db.get_value("Student Group", first_group, "program")
	
	return program


@frappe.whitelist()
def get_school_abbr_logo():
	abbr = frappe.db.get_single_value(
		"Education Settings", "school_college_name_abbreviation"
	)
	logo = frappe.db.get_single_value("Education Settings", "school_college_logo")
	return {"name": abbr, "logo": logo}


@frappe.whitelist()
def get_student_attendance(student=None, student_group=None, **kwargs):
	if not student or not student_group:
		return []
	return frappe.db.get_list(
		"Student Attendance",
		filters={"student": student, "student_group": student_group, "docstatus": 1},
		fields=["date", "status", "name"],
		ignore_permissions=True,
	)


# Timetable API methods
@frappe.whitelist()
def get_teachers():
	instructors = frappe.get_all(
		"Instructor",
		filters={"status": "Active"},
		fields=["name", "instructor_name"],
		order_by="instructor_name",
		ignore_permissions=True,
	)
	return [{"value": i.name, "label": i.instructor_name or i.name} for i in instructors]


@frappe.whitelist()
def get_streams():
	student_groups = frappe.get_all(
		"Student Group",
		filters={"disabled": 0},
		fields=["name", "student_group_name"],
		order_by="student_group_name",
		ignore_permissions=True,
	)
	return [{"value": sg.name, "label": sg.student_group_name or sg.name} for sg in student_groups]


@frappe.whitelist()
def get_rooms():
	rooms = frappe.get_all(
		"Room",
		fields=["name", "room_name"],
		order_by="room_name",
		ignore_permissions=True,
	)
	return [{"value": r.name, "label": r.room_name or r.name} for r in rooms]


@frappe.whitelist()
def get_courses():
	courses = frappe.get_all(
		"Course",
		fields=["name", "course_name"],
		order_by="course_name",
		ignore_permissions=True,
	)
	return [{"value": c.name, "label": c.course_name or c.name} for c in courses]


@frappe.whitelist()
def get_course_schedule(instructor=None, stream=None, level=None):
	filters = {}
	if instructor:
		filters["instructor"] = ["like", f"%{instructor}%"]
	if stream:
		filters["student_group"] = ["like", f"%{stream}%"]

	schedules = frappe.get_all(
		"Course Schedule",
		filters=filters,
		fields=[
			"name",
			"course",
			"instructor",
			"instructor_name",
			"student_group",
			"room",
			"schedule_date",
			"from_time",
			"to_time",
			"program",
		],
		order_by="schedule_date, from_time",
		ignore_permissions=True,
	)
	
	if level:
		level_programs = frappe.get_all(
			"Program",
			filters={"program_name": ["like", f"%{level}%"]},
			fields=["name"],
			ignore_permissions=True
		)
		level_program_names = [p.name for p in level_programs]
		schedules = [s for s in schedules if s.program and s.program in level_program_names]
	
	return schedules


@frappe.whitelist()
def get_course_schedule_details(schedule_name):
	return frappe.get_doc("Course Schedule", schedule_name, ignore_permissions=True).as_dict()


@frappe.whitelist()
def update_course_schedule(schedule_name, schedule_date, from_time, to_time):
	if "Instructor" in frappe.get_roles() and "Education Manager" not in frappe.get_roles():
		frappe.throw("You do not have permission to update the timetable", frappe.PermissionError)
	
	try:
		doc = frappe.get_doc("Course Schedule", schedule_name)
		doc.schedule_date = schedule_date
		doc.from_time = from_time
		doc.to_time = to_time
		doc.save()
		return "success"
	except Exception as e:
		frappe.log_error(f"Error updating course schedule: {str(e)}")
		return "error"


@frappe.whitelist()
def update_course_schedule_details(
	schedule_name, course, instructor, student_group, room, schedule_date, from_time, to_time
):
	if "Instructor" in frappe.get_roles() and "Education Manager" not in frappe.get_roles():
		frappe.throw("You do not have permission to update the timetable", frappe.PermissionError)
	
	try:
		doc = frappe.get_doc("Course Schedule", schedule_name)
		doc.course = course
		doc.instructor = instructor
		doc.student_group = student_group
		doc.room = room
		doc.schedule_date = schedule_date
		doc.from_time = from_time
		doc.to_time = to_time
		doc.save()
		return "success"
	except Exception as e:
		frappe.log_error(f"Error updating course schedule details: {str(e)}")
		return "error"


@frappe.whitelist()
def create_course_schedule(
	course, instructor, student_group, room, schedule_date, from_time, to_time
):
	if "Instructor" in frappe.get_roles() and "Education Manager" not in frappe.get_roles():
		frappe.throw("You do not have permission to create course schedules", frappe.PermissionError)
	
	try:
		program = frappe.db.get_value("Student Group", student_group, "program")
		
		doc = frappe.new_doc("Course Schedule")
		doc.course = course
		doc.instructor = instructor
		doc.student_group = student_group
		doc.room = room
		doc.schedule_date = schedule_date
		doc.from_time = from_time
		doc.to_time = to_time
		if program:
			doc.program = program
		doc.insert()
		return doc.name
	except Exception as e:
		frappe.log_error(f"Error creating course schedule: {str(e)}")
		return "error"


@frappe.whitelist()
def get_student_grades(student=None, program=None, **kwargs):
	if not student:
		return []
	
	grades = frappe.db.get_list(
		"Assessment Result",
		fields=[
			"name",
			"student_group",
			"course",
			"assessment_group",
			"total_score",
			"maximum_score",
			"grade",
		],
		filters={"student": student, "program": program},
		ignore_permissions=True,
	)
	return grades
