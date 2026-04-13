// Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Student Report Generation Tool', {
  onload: function (frm) {
    frm.set_query('academic_term', function () {
      return {
        filters: {
          academic_year: frm.doc.academic_year,
        },
      }
    })
    frm.set_query('assessment_group', function () {
      return {
        filters: {
          is_group: 1,
        },
      }
    })
  },

  refresh: function (frm) {
    frm.disable_save()
    frm.page.clear_indicator()
    
    // Single Print button - automatically shows preview then prints
    frm.page.set_primary_action(__('Print'), function () {
      generate_and_print(frm)
    })
    
    // Auto-generate preview when all required fields are filled
    auto_generate_preview(frm)
  },

  student: function (frm) {
    if (frm.doc.student) {
      frappe.call({
        method: 'education.education.api.get_current_enrollment',
        args: {
          student: frm.doc.student,
          academic_year: frm.doc.academic_year,
        },
        callback: function (r) {
          if (r) {
            $.each(r.message, function (i, d) {
              if (frm.fields_dict.hasOwnProperty(i)) {
                frm.set_value(i, d)
              }
            })
          }
        },
      })
    }
  },

  academic_year: function (frm) {
    auto_generate_preview(frm)
  },
  
  academic_term: function (frm) {
    auto_generate_preview(frm)
  },
  
  assessment_group: function (frm) {
    auto_generate_preview(frm)
  },
  
  program: function (frm) {
    auto_generate_preview(frm)
  },
  
  include_principal_signature: function (frm) {
    auto_generate_preview(frm)
  },
  
  include_teacher_comments: function (frm) {
    auto_generate_preview(frm)
  },
  
  add_letterhead: function (frm) {
    auto_generate_preview(frm)
  }
})

function generate_and_print(frm) {
  let doc = frm.doc
  if (!doc.student || !doc.assessment_group || !doc.program || !doc.academic_year) {
    frappe.throw(__('Please fill in all the mandatory fields.'))
  }
  
  frm.page.set_indicator(__('Generating Preview...'), 'blue')
  
  frappe.call({
    method: 'nl_school.junior_school_customization.controllers.student_report_generation_tool.preview_report_card',
    args: {
      doc: JSON.stringify({
        student: doc.student,
        students: [doc.student],
        academic_year: doc.academic_year,
        academic_term: doc.academic_term,
        assessment_group: doc.assessment_group,
        add_letterhead: doc.add_letterhead,
        include_attendance: 1,
        include_principal_signature: doc.include_principal_signature || 0,
        include_teacher_comments: doc.include_teacher_comments !== 0 ? 1 : 0,
        custom_teachers_comment: doc.custom_teachers_comment
      }),
      preview_only: false
    },
    callback: function (r) {
      frm.page.clear_indicator()
    },
    error_callback: function () {
      frm.page.clear_indicator()
    }
  })
}

function auto_generate_preview(frm) {
  let doc = frm.doc
  // Check if all required fields are filled
  if (!doc.student || !doc.assessment_group || !doc.program || !doc.academic_year) {
    return
  }
  
  // Debounce the preview generation
  if (frm.preview_timeout) {
    clearTimeout(frm.preview_timeout)
  }
  
  frm.preview_timeout = setTimeout(function() {
    frappe.call({
      method: 'nl_school.junior_school_customization.controllers.student_report_generation_tool.preview_report_card',
      args: {
        doc: JSON.stringify({
          student: doc.student,
          students: [doc.student],
          academic_year: doc.academic_year,
          academic_term: doc.academic_term,
          assessment_group: doc.assessment_group,
          add_letterhead: doc.add_letterhead,
          include_attendance: 1,
          include_principal_signature: doc.include_principal_signature || 0,
          include_teacher_comments: doc.include_teacher_comments !== 0 ? 1 : 0,
          custom_teachers_comment: doc.custom_teachers_comment
        }),
        preview_only: true
      },
      callback: function (r) {
        if (r.message) {
          // Show preview in a container below the form
          show_preview_container(frm, r.message)
        }
      }
    })
  }, 500)
}

function show_preview_container(frm, html) {
  // Remove existing preview
  frm.fields_dict.preview_container && frm.fields_dict.preview_container.$wrapper.remove()
  
  // Create new preview container
  let preview_html = `
    <div style="margin-top: 20px; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden;">
      <div style="background: #f3f4f6; padding: 10px 15px; border-bottom: 1px solid #d1d5db; display: flex; justify-content: space-between; align-items: center;">
        <strong style="color: #374151;">Report Card Preview</strong>
        <span style="color: #6b7280; font-size: 12px;">Auto-updates when you change settings</span>
      </div>
      <div style="padding: 20px; background: white; max-height: 500px; overflow-y: auto;">
        ${html}
      </div>
    </div>
  `
  
  // Add the preview to the form
  frm.add_field({
    fieldtype: 'HTML',
    fieldname: 'preview_container',
    label: 'Preview',
    options: preview_html
  })
}