/* School JavaScript - Kenyan Junior School Customization */
(function() {
  // Kenyan School Terminology Mapping
  const terminologyMap = {
  // Page titles and headers
  "Student": "Learner",
  "Students": "Learners",
  "Teacher": "Teacher",
  "Teachers": "Teachers",
  "Program": "Class",
  "Programs": "Classes",
  "Assessment Result": "Marks / Results",
  "Assessment Results": "Marks / Results",
  "Assessment Plan": "Exam Schedule",
  "Assessment Plans": "Exam Schedules",
  "Fee Schedule": "School Fees",
  "Fee Schedules": "School Fees",
  "Sales Invoice": "Fee Invoice",
  "Sales Invoices": "Fee Invoices",
  "Guardian": "Parent / Guardian",
  "Guardians": "Parents / Guardians",
  "Academic Term": "School Term",
  "Academic Terms": "School Terms",
  "Academic Year": "School Year",
  "Academic Years": "School Years",
  "Student Attendance": "Attendance Register",
  "Student Group": "Stream",
  "Student Groups": "Streams",
  "Course Enrollment": "Subject Registration",
  "Program Enrollment": "Class Admission",
  "Student Applicant": "Admission Application",
  "Learning Management System": "",
  "Assessment Criteria": "Grading Scale"
};

  // Apply terminology overrides after DOM load
  function applyTerminology() {
    // Update sidebar labels - preserve icon if any
    document.querySelectorAll('[data-label]').forEach(el => {
      const originalLabel = el.getAttribute('data-label');
      if (terminologyMap[originalLabel]) {
        const anchor = el.querySelector('a');
        if (anchor) {
          const icon = anchor.querySelector('i');
          if (icon) {
            // Preserve the icon and change the text
            anchor.innerHTML = icon.outerHTML + ' ' + terminologyMap[originalLabel];
          } else {
            // No icon, just change the text
            anchor.textContent = terminologyMap[originalLabel];
          }
        }
      }
    });
    
    // Update page titles and headers
    document.querySelectorAll('.page-title, .page-head h1, .page-head h2').forEach(el => {
      const text = el.textContent.trim();
      Object.keys(terminologyMap).forEach(key => {
        if (text === key) {
          el.textContent = terminologyMap[key];
        }
      });
    });
    
    // Update button texts and form labels
    document.querySelectorAll('button, .control-label, .field-label').forEach(el => {
      const text = el.textContent.trim();
      Object.keys(terminologyMap).forEach(key => {
        if (text === key) {
          el.textContent = terminologyMap[key];
        }
      });
    });
  }

  // Role-based sidebar filtering
  function filterSidebarByRole() {
    if (!frappe.user_roles) return;
    
    const isTeacher = frappe.user_roles.includes("Teacher");
    const isBursar = frappe.user_roles.includes("Bursar") || frappe.user_roles.includes("Accounts Manager");
    const isHeadteacher = frappe.user_roles.includes("Head Teacher") || frappe.user_roles.includes("School Administrator");
    
    // Define what each role should see
    const teacherItems = ["Learner", "Attendance Register", "Marks / Results"];
    const bursarItems = ["School Fees", "Fee Invoice", "Payment Entry"];
    const headteacherItems = []; // Headteacher sees everything (read-only handled elsewhere)
    
    // Hide all sidebar items first, then show role-appropriate ones
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      const label = item.getAttribute('data-label');
      if (!label) return;
      
      let shouldShow = true;
      
      if (isTeacher && !teacherItems.includes(label)) {
        shouldShow = false;
      } else if (isBursar && !bursarItems.includes(label)) {
        shouldShow = false;
      }
      // Headteacher sees everything, so no filtering
      
      if (!shouldShow) {
        item.style.display = 'none';
      }
    });
  }

  // Dashboard stats integration
  function loadDashboardStats() {
    if (!frappe.route_options || frappe.route_options.module !== "Education") return;
    
    frappe.call({
      method: "education.api.get_dashboard_stats",
      callback: function(r) {
        if (r.message) {
          const statsContainer = document.createElement('div');
          statsContainer.className = 'school-stat-cards';
          statsContainer.innerHTML = `
            <div class="school-stat-card">
              <div class="label">Total Learners</div>
              <div class="value">${r.message.total_learners || 0}</div>
            </div>
            <div class="school-stat-card">
              <div class="label">Today's Attendance %</div>
              <div class="value">${r.message.today_attendance_pct || 0}%</div>
            </div>
            <div class="school-stat-card">
              <div class="label">Unpaid Fees</div>
              <div class="value">${r.message.unpaid_fee_count || 0}</div>
            </div>
            <div class="school-stat-card">
              <div class="label">Staff Present</div>
              <div class="value">${r.message.staff_present_count || 0}</div>
            </div>
          `;
          
          const mainSection = document.querySelector('.layout-main-section');
          if (mainSection) {
            mainSection.insertBefore(statsContainer, mainSection.firstChild);
          }
        }
      }
    });
  }

  // Student list view optimization
  function optimizeStudentListView() {
    if (frappe.route !== "List/Student") return;
    
    // Reduce visible columns to: Learner Name, Class (Grade), Parent Phone, Fee Status
    const headers = document.querySelectorAll('.list-table thead th');
    headers.forEach((header, index) => {
      const headerText = header.textContent.trim();
      // Keep only essential columns
      if (!["Learner Name", "Class", "Parent Phone", "Fee Status"].includes(headerText)) {
        header.style.display = 'none';
  // Hide corresponding cells in rows
  document.querySelectorAll(`.list-table tbody tr td:nth-child(${index + 1})`).forEach(cell => {
    cell.style.display = 'none';
  });
      }
    });
  }

  // Fee Schedule list view enhancements
  function enhanceFeeScheduleList() {
    if (frappe.route !== "List/Fee Schedule") return;
    
    // Add "Send fee reminder" button to each row toolbar
    setTimeout(() => {
      document.querySelectorAll('.list-row-actions .btn-group').forEach(group => {
        const reminderBtn = document.createElement('button');
        reminderBtn.className = 'btn btn-sm btn-default';
        reminderBtn.innerHTML = '<i class="fa fa-bell"></i> Remind';
        reminderBtn.onclick = function() {
          const row = this.closest('.list-row');
          const studentId = row.querySelector('[data-fieldname="student"] a')?.getAttribute('data-name');
          if (studentId) {
            frappe.call({
              method: "education.api.send_paystack_link",
              args: { student_id: studentId },
              callback: function(r) {
                if (r.message) {
                  window.open(r.message, '_blank');
                }
              }
            });
          }
        };
        group.appendChild(reminderBtn);
      });
    }, 500);
  }

  // Student Attendance Tool enhancements
  function enhanceAttendanceTool() {
    if (frappe.route !== "Form/Student Attendance Tool") return;
    
    // Auto-select today's date
    setTimeout(() => {
      const dateField = document.querySelector('[data-fieldname="date"] input');
      if (dateField && !dateField.value) {
        const today = new Date().toISOString().split('T')[0];
        dateField.value = today;
        dateField.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Auto-focus class/stream selector
      const classField = document.querySelector('[data-fieldname="class"]');
      if (classField) {
        classField.focus();
      }
    }, 300);
  }

  // Inject quick actions bar on Education workspace
  function injectQuickActionsBar() {
    if (frappe.route !== "workspace/Education") return;
    
    const quickActions = document.createElement('div');
    quickActions.className = 'school-quick-actions';
    quickActions.innerHTML = `
      <a href="/app/student-list" class="btn btn-default">
        <i class="fa fa-users"></i> Mark Attendance
      </a>
      <a href="/app/fee-schedule" class="btn btn-default">
        <i class="fa fa-credit-card"></i> Record Payment
      </a>
      <a href="/app/assessment-result" class="btn btn-default">
        <i class="fa fa-pencil-alt"></i> Enter Marks
      </a>
    `;
    
    const workspaceHeader = document.querySelector('.workspace-header');
    if (workspaceHeader) {
      workspaceHeader.insertAdjacentElement('afterend', quickActions);
    }
  }

  // Initialize everything after DOM load and AJAX calls
  frappe.ready(function() {
    applyTerminology();
    filterSidebarByRole();
    loadDashboardStats();
    optimizeStudentListView();
    enhanceFeeScheduleList();
    enhanceAttendanceTool();
    injectQuickActionsBar();
  });

  frappe.after_ajax(function() {
    applyTerminology();
    filterSidebarByRole();
    loadDashboardStats();
    optimizeStudentListView();
    enhanceFeeScheduleList();
    enhanceAttendanceTool();
    injectQuickActionsBar();
  });

  frappe.after_route_change(function() {
    applyTerminology();
    filterSidebarByRole();
    loadDashboardStats();
    optimizeStudentListView();
    enhanceFeeScheduleList();
    enhanceAttendanceTool();
    injectQuickActionsBar();
  });
})();