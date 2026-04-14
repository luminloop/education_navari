import shutil
import subprocess
from pathlib import Path

import frappe


def build_frontend():
	"""Build the Vue student portal during deploy.

	Runs before every `bench migrate`, so Frappe Cloud (and any other host)
	produces `education/public/frontend/` and `education/www/student-portal.html`
	from source instead of requiring the generated files to be committed.
	"""
	app_root = Path(frappe.get_app_path("education")).parent

	yarn = shutil.which("yarn")
	if not yarn:
		frappe.log_error("yarn not found on PATH; skipping student portal build", "Education Build")
		return

	subprocess.check_call([yarn, "install"], cwd=app_root)
	subprocess.check_call([yarn, "build"], cwd=app_root)
