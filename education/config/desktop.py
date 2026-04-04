from frappe import _


def get_data():
	return [
		{
			"module_name": "Education",
			"color": "grey",
			"icon": "octicon octicon-file-directory",
			"type": "link",
			"link": "/desk/school-dashboard",
			"label": _("Education"),
		}
	]
