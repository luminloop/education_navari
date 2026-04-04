frappe.pages["education-timetable"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "School Timetable",
    single_column: true,
  });

  $(page.body).append(`
        <div id="calendar-wrapper" class="card" style="margin: 15px; border: none; box-shadow: none;">
            <div class="card-body" style="padding: 0;">
                <div id="calendar"></div>
            </div>
        </div>
        <div id="printable-timetable" class="d-none"></div>

        <!-- Edit/Create Schedule Modal -->
        <div class="modal fade" id="scheduleModal" tabindex="-1" role="dialog" aria-labelledby="scheduleModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="scheduleModalLabel">Schedule</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                      <form id="schedule-form">
                        <input type="hidden" id="schedule-id">

                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label for="edit-course">Course</label>
                                <select class="form-control" id="edit-course"></select>
                            </div>
                            <div class="form-group col-md-6">
                                <label for="edit-instructor">Instructor</label>
                                <select class="form-control" id="edit-instructor"></select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label for="edit-student-group">Student Group</label>
                                <select class="form-control" id="edit-student-group"></select>
                            </div>
                            <div class="form-group col-md-6">
                                <label for="edit-room">Room</label>
                                <select class="form-control" id="edit-room"></select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label for="edit-from-time">From Time</label>
                                <input type="time" class="form-control" id="edit-from-time">
                            </div>

                             <div class="form-group col-md-6">
                                <label for="edit-to-time">To Time</label>
                                <input type="time" class="form-control" id="edit-to-time">
                            </div>
                        </div>

                        <div class="form-row">
                        <div class="form-group col-md-6">
                                <label for="edit-date">Date</label>
                                <input type="date" class="form-control" id="edit-date">
                            </div>
                        </div>
                    </form>

                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="save-schedule">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `);

  let css_link = document.createElement("link");
  css_link.rel = "stylesheet";
  css_link.href =
    "https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css";
  document.head.appendChild(css_link);

  let script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js";
  script.onload = render_calendar;
  document.head.appendChild(script);

  let calendar;
  let selectedFilter = null;
  let selectedValue = "";
  let selectedLevel = "";
  let allTeachers = [];
  let allStreams = [];
  let allRooms = [];
  let isNewSchedule = false;

  let level_filter = page.add_field({
    label: "Level",
    fieldtype: "Select",
    fieldname: "level",
    options: ["", "Pre-Primary", "Primary"],
    change: function () {
      let val = level_filter.get_value();
      selectedLevel = val === "Pre-Primary" ? "pre-primary" : val === "Primary" ? "primary" : "";
      // Re-render calendar only if it affects the data or printable timetable
    },
  });

  let teacher_filter = page.add_field({
    label: "Teacher",
    fieldtype: "Link",
    fieldname: "teacher",
    options: "Instructor",
    change: function () {
      let val = teacher_filter.get_value();
      if (val) {
        selectedFilter = "instructor";
        selectedValue = val;
        stream_filter.set_value("");
      } else if (!stream_filter.get_value()) {
        selectedFilter = null;
        selectedValue = "";
      }
      render_calendar(selectedFilter, selectedValue);
    },
  });

  let stream_filter = page.add_field({
    label: "Stream",
    fieldtype: "Link",
    fieldname: "stream",
    options: "Student Group",
    change: function () {
      let val = stream_filter.get_value();
      if (val) {
        selectedFilter = "stream";
        selectedValue = val;
        teacher_filter.set_value("");
      } else if (!teacher_filter.get_value()) {
        selectedFilter = null;
        selectedValue = "";
      }
      render_calendar(selectedFilter, selectedValue);
    },
  });

  page.add_inner_button(__("Clear Filters"), function () {
    level_filter.set_value("");
    teacher_filter.set_value("");
    stream_filter.set_value("");
    selectedFilter = null;
    selectedValue = "";
    selectedLevel = "";
    render_calendar();
  });

  let customStyles = document.createElement("style");
  customStyles.innerHTML = `
        #calendar-wrapper {
            background: var(--card-bg, #ffffff);
            border-radius: var(--border-radius, 8px);
            overflow: hidden;
        }
        #calendar {
            padding: 15px;
        }

        /* Increase time row height */
        .fc-timegrid-slot {
            height: 50px !important;
        }
        /* Calendar button styling to match Frappe */
        .fc .fc-button-primary {
            background-color: var(--control-bg) !important;
            border-color: var(--border-color) !important;
            color: var(--text-color) !important;
            box-shadow: none !important;
            text-transform: capitalize;
            font-weight: 500;
        }
        .fc .fc-button-primary:hover {
            background-color: var(--control-bg-hover) !important;
        }
        .fc .fc-button-primary:not(:disabled):active,
        .fc .fc-button-primary:not(:disabled).fc-button-active {
            background-color: var(--bg-gray) !important;
            border-color: var(--border-color) !important;
            color: var(--text-color) !important;
            box-shadow: inset 0 3px 5px rgba(0,0,0,.125) !important;
        }
        .fc-toolbar-title {
            font-size: 1.25rem !important;
            font-weight: 600 !important;
            color: var(--text-color);
        }
        .fc-theme-standard th {
            padding: 8px 0 !important;
            background-color: var(--bg-light-gray);
            font-weight: 600;
            color: var(--text-muted);
            border-color: var(--border-color);
        }
        .fc-theme-standard td, .fc-theme-standard th {
            border-color: var(--border-color);
        }

        /* Mobile responsive styles */
        @media (max-width: 768px) {
            /* Calendar mobile adjustments */
            #calendar {
                padding: 10px;
            }
            .fc {
                font-size: 11px !important;
            }
            .fc-toolbar {
                flex-direction: column !important;
                gap: 12px;
            }
            .fc-toolbar-title {
                font-size: 16px !important;
            }
            .fc-toolbar-chunk {
                display: flex;
                justify-content: center;
                width: 100%;
            }
            .fc-toolbar-chunk .fc-button-group {
                width: 100%;
                display: flex;
            }
            .fc-toolbar-chunk .fc-button {
                flex: 1;
                padding: 6px 8px !important;
                font-size: 11px !important;
            }
            .fc-timegrid-slot {
                height: 45px !important;
            }
            .fc-event-title {
                font-size: 10px !important;
                white-space: normal !important;
                overflow: hidden !important;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
        }
    `;
  document.head.appendChild(customStyles);

  // Add Frappe Page Actions
  page.set_primary_action(__('Print Timetable'), function() {
    generatePrintableTimetable(selectedFilter, selectedValue);
  }, 'printer');

  // Fetch teachers and populate dropdown
  frappe.call({
    method:
      "education.education.api.get_teachers",
    callback: function (response) {
      allTeachers = response.message || [];
      let editInstructorDropdown = $("#edit-instructor");

      allTeachers.forEach((teacher) => {
        editInstructorDropdown.append(
          `<option value="${teacher.value}">${teacher.label}</option>`,
        );
      });
    },
  });

  // Fetch streams and populate dropdown
  frappe.call({
    method:
      "education.education.api.get_streams",
    callback: function (response) {
      allStreams = response.message || [];
      let editStudentGroupDropdown = $("#edit-student-group");

      allStreams.forEach((stream) => {
        editStudentGroupDropdown.append(
          `<option value="${stream.value}">${stream.label}</option>`,
        );
      });
    },
  });

  frappe.call({
    method:
      "education.education.api.get_rooms",
    callback: function (response) {
      allRooms = response.message || [];
      let allRoomsDropdown = $("#edit-room");
      allRooms.forEach((room) => {
        allRoomsDropdown.append(
          `<option value="${room.value}">${room.label}</option>`,
        );
      });
    },
  });

  //fetch courses
  frappe.call({
    method:
      "education.education.api.get_courses",
    callback: function (response) {
      let allCoursesDropdown = $("#edit-course");
      (response.message || []).forEach((course) => {
        allCoursesDropdown.append(
          `<option value="${course.value}">${course.label}</option>`,
        );
      });
    },
  });

  function render_calendar(filter_by = null, filter_value = "") {
    let calendarEl = document.getElementById("calendar");

    if (calendar) {
      calendar.destroy();
    }

    // Detect mobile and set appropriate initial view
    const isMobile = window.innerWidth <= 768;
    const initialView = isMobile ? "timeGridDay" : "timeGridWeek";

    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: initialView,
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },
      slotDuration: "00:45:00",
      slotMinTime: "06:00:00",
      slotMaxTime: "18:00:00",
      allDaySlot: false,
      nowIndicator: true,
      editable: true,
      // Responsive height
      height: isMobile ? "auto" : null,
      expandRows: !isMobile,
      eventClick: function (info) {
        openEditModal(info.event.id);
      },
      dateClick: function (info) {
        openCreateModal(info.date);
      },
      eventDrop: function (info) {
        updateEventTime(info.event);
      },
      eventResize: function (info) {
        updateEventTime(info.event);
      },
      events: function (fetchInfo, successCallback, failureCallback) {
        frappe.call({
          method:
            "education.education.api.get_course_schedule",
          args: {},
          callback: function (response) {
            let events = (response.message || [])
              .filter((event) => {
                if (filter_by === "instructor" && filter_value) {
                  return event.instructor
                    .toLowerCase()
                    .includes(filter_value.toLowerCase());
                } else if (filter_by === "stream" && filter_value) {
                  return event.student_group
                    .toLowerCase()
                    .includes(filter_value.toLowerCase());
                }
                return true;
              })
              .map((event) => ({
                id: event.name,
                title: `${event.course} - ${event.instructor}`,
                start: `${event.schedule_date}T${event.from_time}`,
                end: `${event.schedule_date}T${event.to_time}`,
                backgroundColor:
                  event.course.includes("Break") ||
                  event.course.includes("Lunch")
                    ? "#f8d7da"
                    : "#007bff",
                extendedProps: {
                  course: event.course,
                  instructor: event.instructor,
                  student_group: event.student_group,
                  room: event.room,
                  program: event.program,
                },
              }));
            successCallback(events);
          },
        });
      },
    });

    calendar.render();
  }

  function openEditModal(scheduleId) {
    isNewSchedule = false;

    $("#scheduleModalLabel").text("Edit Schedule");

    frappe.call({
      method:
        "education.education.api.get_course_schedule_details",
      args: { schedule_name: scheduleId },
      callback: function (response) {
        const schedule = response.message;
        if (schedule) {
          const formattedDate = schedule.schedule_date;

          $("#schedule-id").val(schedule.name);
          $("#edit-course").val(schedule.course);
          $("#edit-instructor").val(schedule.instructor);
          $("#edit-student-group").val(schedule.student_group);
          $("#edit-room").val(schedule.room);
          $("#edit-date").val(formattedDate);
          $("#edit-from-time").val(schedule.from_time);
          $("#edit-to-time").val(schedule.to_time);

          $("#scheduleModal").modal("show");
        } else {
          frappe.throw(__("Failed to retrieve schedule details"));
        }
      },
    });
  }

  function openCreateModal(date) {
    isNewSchedule = true;

    $("#scheduleModalLabel").text("Create New Schedule");

    const formattedDate = date.toISOString().split("T")[0];

    let hours = date.getHours().toString().padStart(2, "0");
    let minutes = date.getMinutes().toString().padStart(2, "0");
    const clickTime = `${hours}:${minutes}`;

    const endDate = new Date(date);
    endDate.setMinutes(endDate.getMinutes() + 45);
    let endHours = endDate.getHours().toString().padStart(2, "0");
    let endMinutes = endDate.getMinutes().toString().padStart(2, "0");
    const endTime = `${endHours}:${endMinutes}`;

    $("#schedule-id").val("");
    $("#edit-course").val("");
    $("#edit-instructor").val("");
    $("#edit-student-group").val("");
    $("#edit-room").val("");
    $("#edit-date").val(formattedDate);
    $("#edit-from-time").val(`${clickTime}:00`);
    $("#edit-to-time").val(`${endTime}:00`);

    $("#scheduleModal").modal("show");
  }

  // Update event time after drag/resize
  function updateEventTime(event) {
    const startTime = event.start.toISOString().split("T")[1].substring(0, 8);
    const endTime = event.end.toISOString().split("T")[1].substring(0, 8);
    const scheduleDate = event.start.toISOString().split("T")[0];

    frappe.call({
      method:
        "education.education.api.update_course_schedule",
      args: {
        schedule_name: event.id,
        schedule_date: scheduleDate,
        from_time: startTime,
        to_time: endTime,
      },
      callback: function (response) {
        if (response.message === "success") {
          frappe.show_alert(
            {
              message: __("Schedule updated successfully"),
              indicator: "green",
            },
            3,
          );
        } else {
          frappe.show_alert(
            {
              message: __("Failed to update schedule"),
              indicator: "red",
            },
            3,
          );
          calendar.refetchEvents();
        }
      },
    });
  }

  // Save schedule changes or create new
  $("#save-schedule").on("click", function () {
    const scheduleId = $("#schedule-id").val();
    const course = $("#edit-course").val();
    const instructor = $("#edit-instructor").val();
    const studentGroup = $("#edit-student-group").val();
    const room = $("#edit-room").val();
    const scheduleDate = $("#edit-date").val();
    const fromTime = $("#edit-from-time").val();
    const toTime = $("#edit-to-time").val();

    // Validate form
    if (
      !course ||
      !instructor ||
      !studentGroup ||
      !scheduleDate ||
      !fromTime ||
      !toTime
    ) {
      frappe.msgprint(__("Please fill in all required fields"));
      return;
    }

    if (isNewSchedule) {
      // Create new schedule
      frappe.call({
        method:
          "education.education.api.create_course_schedule",
        args: {
          course: course,
          instructor: instructor,
          student_group: studentGroup,
          room: room,
          schedule_date: scheduleDate,
          from_time: fromTime,
          to_time: toTime,
        },
        callback: function (response) {
          if (response.message && response.message !== "error") {
            $("#scheduleModal").modal("hide");
            frappe.show_alert(
              {
                message: __("Schedule created successfully"),
                indicator: "green",
              },
              3,
            );
            // Refresh calendar events
            calendar.refetchEvents();
          } else {
            frappe.show_alert(
              {
                message: __("Failed to create schedule"),
                indicator: "red",
              },
              3,
            );
          }
        },
      });
    } else {
      // Update existing schedule
      frappe.call({
        method:
          "education.education.api.update_course_schedule_details",
        args: {
          schedule_name: scheduleId,
          course: course,
          instructor: instructor,
          student_group: studentGroup,
          room: room,
          schedule_date: scheduleDate,
          from_time: fromTime,
          to_time: toTime,
        },
        callback: function (response) {
          if (response.message === "success") {
            $("#scheduleModal").modal("hide");
            frappe.show_alert(
              {
                message: __("Schedule updated successfully"),
                indicator: "green",
              },
              3,
            );
            // Refresh calendar events
            calendar.refetchEvents();
          } else {
            frappe.show_alert(
              {
                message: __("Failed to update schedule"),
                indicator: "red",
              },
              3,
            );
          }
        },
      });
    }
  });

  // Handle window resize for responsive calendar
  let resizeTimeout;
  $(window).on("resize", function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      if (calendar) {
        const isMobile = window.innerWidth <= 768;
        const currentView = calendar.view.type;
        
        // Switch to day view on mobile if currently on week view
        if (isMobile && currentView === "timeGridWeek") {
          calendar.changeView("timeGridDay");
        }
        // Switch to week view on desktop if currently on day view
        else if (!isMobile && currentView === "timeGridDay") {
          calendar.changeView("timeGridWeek");
        }
        
        calendar.updateSize();
      }
    }, 250);
  });

  document.getElementById("btn-print")?.addEventListener("click", function () {
    generatePrintableTimetable(selectedFilter, selectedValue);
  });

  function generatePrintableTimetable(filter_type, filter_value) {
    frappe.call({
      method:
        "education.education.api.get_course_schedule",
      args: { [filter_type]: filter_value },
      callback: function (response) {
        let schedules = response.message || [];

        let weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

        // Pre-Primary time slots
        let prePrimaryTimeSlots = [
          { start: "7:40 AM", end: "8:15 AM", label: "Breakfast" },
          { start: "8:15 AM", end: "9:00 AM" },
          { start: "9:00 AM", end: "9:45 AM" },
          { start: "9:45 AM", end: "10:30 AM", label: "First Break" },
          { start: "10:30 AM", end: "11:15 AM" },
          { start: "11:15 AM", end: "11:30 AM" },
          { start: "11:30 AM", end: "11:45 AM", label: "Second Break" },
          { start: "11:45 AM", end: "12:30 PM" },
          { start: "12:30 PM", end: "1:20 PM", label: "Lunch" },
          { start: "1:20 PM", end: "2:15 PM" },
          { start: "2:15 PM", end: "3:00 PM" },
        ];

        let primaryTimeSlots = [
          { start: "6:45 AM", end: "7:40 AM" },
          { start: "7:40 AM", end: "8:10 AM", label: "Breakfast" },
          { start: "8:10 AM", end: "8:55 AM" },
          { start: "8:55 AM", end: "9:40 AM" },
          { start: "9:40 AM", end: "9:50 AM", label: "First Break" },
          { start: "9:50 AM", end: "10:35 AM" },
          { start: "10:35 AM", end: "11:20 AM" },
          { start: "11:20 AM", end: "11:30 AM", label: "Second Break" },
          { start: "11:30 AM", end: "12:15 PM" },
          { start: "12:15 PM", end: "1:00 PM" },
          { start: "1:00 PM", end: "1:45 PM", label: "Lunch" },
          { start: "1:45 PM", end: "1:55 PM" },
          { start: "1:55 PM", end: "2:40 PM" },
          { start: "2:40 PM", end: "3:25 PM" },
          { start: "3:25 PM", end: "4:10 PM" },
        ];

        let timeSlots =
          selectedLevel === "pre-primary"
            ? prePrimaryTimeSlots
            : primaryTimeSlots;

        let showInstructor = filter_type === "stream";
        let showStudentGroup = filter_type === "instructor";

        let title = filter_value
          ? `${filter_value} Timetable`
          : "School Timetable";
        if (selectedLevel) {
          title = `${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} School ${title}`;
        }

        let tableHTML = `
                <h3 class="text-center">${title}</h3>
                <div style="display: flex; justify-content: center; overflow-x: auto;">
                    <table class="table table-bordered" style="table-layout: fixed; width: auto; margin: auto;">
                        <thead>
                            <tr>
                                <th style="width: 100px; text-align: center;">Day</th>
                                ${timeSlots
                                  .map(
                                    (slot) => `
                                    <th style="width: 150px; min-height: 80px; text-align: center; vertical-align: middle; font-size: 12px; font-weight: normal;">
                                        ${slot.label ? `${removeAMPM(slot.start)} - ${removeAMPM(slot.end)}<br>(${slot.label})` : `${slot.start} - ${slot.end}`}
                                    </th>`,
                                  )
                                  .join("")}
                            </tr>
                        </thead>
                        <tbody>
                `;

        weekdays.forEach((day) => {
          tableHTML += `<tr><td>${day}</td>`;

          timeSlots.forEach((slot) => {
            // Check if this slot is a predefined break or meal time
            if (slot.label) {
              tableHTML += `<td class="text-center" style="background-color: #f8d7da; font-size: 12px;">${slot.label}</td>`;
              return;
            }

            let matchedSchedule = schedules.find((schedule) => {
              let scheduleDay = new Date(schedule.schedule_date)
                .toLocaleDateString("en-US", { weekday: "long" })
                .trim();
              let scheduleTime = convertTo12HourFormat(schedule.from_time);

              return scheduleDay === day && scheduleTime === slot.start;
            });

            if (matchedSchedule) {
              let displayText = "";

              if (showInstructor) {
                displayText = `${matchedSchedule.course} - <span style="color: blue;">${matchedSchedule.instructor}</span>`;
              } else if (showStudentGroup) {
                displayText = `${matchedSchedule.course} - <span style="color: green;">${matchedSchedule.student_group}</span>`;
              } else {
                displayText = matchedSchedule.course;
              }

              tableHTML += `<td>${displayText}</td>`;
            } else {
              tableHTML += `<td></td>`;
            }
          });

          tableHTML += `</tr>`;
        });

        tableHTML += `</tbody></table></div>`;

        let printableDiv = document.getElementById("printable-timetable");
        printableDiv.innerHTML = tableHTML;
        printableDiv.classList.remove("d-none");
        printTimetable();
      },
    });
  }

  // Function to remove AM/PM from time labels
  function removeAMPM(timeString) {
    return timeString.replace(/\s?(AM|PM)/g, "");
  }

  // Function to convert time to 12-hour format
  function convertTo12HourFormat(timeString) {
    let timeParts = timeString.split(":");
    let hours = parseInt(timeParts[0], 10);
    let minutes = timeParts.length > 1 ? timeParts[1] : "00";

    let period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  }

  // Print function
  function printTimetable() {
    let printContent = document.getElementById("printable-timetable").innerHTML;
    let newWindow = window.open("", "", "width=1000,height=800");
    newWindow.document.write(`
            <html>
            <head>
                <title>School Timetable</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                <style>
                    @media print {
                        .table th, .table td {
                            padding: 8px;
                            border: 1px solid #ddd;
                        }
                        table {
                            width: 100% !important;
                            table-layout: fixed;
                        }
                        th, td {
                            font-size: 10px;
                            padding: 4px !important;
                        }
                    }
                </style>
            </head>
            <body class="container-fluid mt-3">
                ${printContent}
            </body>
            </html>
        `);
    newWindow.document.close();
    newWindow.print();
  }
};
