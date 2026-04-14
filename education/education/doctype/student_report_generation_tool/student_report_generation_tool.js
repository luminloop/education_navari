// Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt
//
// Note: the desk-facing actions (primary action, signature pad, custom buttons)
// are wired up in the nl_school customization at
// nl_school/public/js/student_report_generation_tool.js so this base file only
// keeps query/lookup helpers and doesn't add competing buttons.

frappe.ui.form.on('Student Report Generation Tool', {
  onload(frm) {
    frm.set_query('academic_term', function () {
      return { filters: { academic_year: frm.doc.academic_year } }
    })
    frm.set_query('assessment_group', function () {
      return { filters: { is_group: 1 } }
    })
  },

  refresh(frm) {
    frm.disable_save()
  },

  student(frm) {
    if (!frm.doc.student) return
    frappe.call({
      method: 'education.education.api.get_current_enrollment',
      args: {
        student: frm.doc.student,
        academic_year: frm.doc.academic_year,
      },
      callback(r) {
        if (!r || !r.message) return
        $.each(r.message, function (i, d) {
          if (frm.fields_dict.hasOwnProperty(i)) {
            frm.set_value(i, d)
          }
        })
      },
    })
  },
})
