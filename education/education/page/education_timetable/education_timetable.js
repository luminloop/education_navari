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

        <!-- Preview Modal -->
        <div class="modal fade" id="timetablePreviewModal" tabindex="-1" role="dialog" aria-labelledby="timetablePreviewModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="timetablePreviewModalLabel">Timetable Preview</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body" id="timetable-preview-content" style="overflow-x: auto;">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="btn-print-timetable">Print Timetable</button>
                    </div>
                </div>
            </div>
        </div>

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

        /* Event styling - cleaner and more compact with enhanced colors */
        .fc-event {
            border: none !important;
            background-color: transparent !important;
            color: var(--text-color) !important;
            border-radius: 3px !important;
            padding: 0 !important;
            overflow: hidden;
        }
        
        .fc-event:hover {
            background-color: var(--control-bg-hover) !important;
        }

        /* Month view - colored pill style events */
        .fc-daygrid-event {
            background-color: #e3f2fd !important; /* Light blue */
            border-left: 3px solid #1976d2 !important; /* Darker blue */
            border-radius: 4px !important;
            margin-bottom: 2px !important;
            padding: 2px 4px !important;
            border: none !important;
        }
        
        .fc-daygrid-event:hover {
            background-color: #bbdefb !important;
        }
        
        /* Timegrid view - horizontal swimlanes with colored backgrounds */
        .fc-timegrid-event {
            background-color: #e8f5e9 !important; /* Light green */
            border-left: 4px solid #2e7d32 !important; /* Dark green */
            border-radius: 4px !important;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
        }
        
        .fc-timegrid-event:hover {
            background-color: #c8e6c9 !important;
        }

        /* Break/Lunch events - warm orange/yellow theme */
        .fc-daygrid-event.break-event, 
        .fc-timegrid-event.break-event {
            background-color: #fff8e1 !important; /* Light amber */
            border-left-color: #ff8f00 !important; /* Amber */
        }
        
        .break-event .fc-event-title-month, 
        .break-event .fc-event-title-week,
        .break-event div {
            color: #e65100 !important;
        }

        /* Timegrid slot alternating background for "swimlane" effect */
        .fc-timegrid-slot:nth-child(odd) {
            background-color: rgba(0,0,0,0.02);
        }
        
        /* Month view styling */
        .fc-daygrid-day-frame {
            padding: 2px;
        }
        .fc-daygrid-day-events {
            margin-top: 2px !important;
        }
        .fc-daygrid-day-number {
            font-size: 0.85em !important;
            padding: 4px !important;
            font-weight: 500 !important;
        }

        /* Timegrid view styling */
        .fc-timegrid-slot {
            height: 35px !important;
        }
        .fc-timegrid-event .fc-event-main-week {
            padding: 2px 4px !important;
        }
        .fc-timegrid-event .fc-event-title-week {
            font-size: 10px !important;
            font-weight: 600 !important;
            color: #1b5e20 !important;
        }
        .fc-timegrid-event div {
            font-size: 9px !important;
            color: #2e7d32 !important;
        }

        /* Current time indicator */
        .fc-timegrid-now-indicator-line {
            border-color: #f44336 !important;
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
      // Better event content rendering
      eventContent: function(arg) {
        const props = arg.event.extendedProps;
        const view = arg.view.type;
        const isBreak = arg.event.extendedProps.course?.includes("Break") || arg.event.extendedProps.course?.includes("Lunch");

        let contentHtml = '';

        if (view === 'dayGridMonth') {
          contentHtml = `
            <div class="fc-event-main-month" style="padding: 1px; font-size: 10px; line-height: 1.3;">
              <div class="fc-event-title-month" style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${arg.event.title}
              </div>
              <div class="fc-event-time-month" style="font-size: 9px; opacity: 0.8;">
                ${props.timeDisplay || ''}
              </div>
            </div>`;
        } else { // timeGridWeek, timeGridDay
          contentHtml = `
            <div class="fc-event-main-week" style="padding: 2px 4px; font-size: 11px; line-height: 1.4;">
              <div class="fc-event-title-week" style="font-weight: 600;">${arg.event.title}</div>
              ${props.instructor ? `<div style="font-size: 10px; margin-top: 1px; opacity: 0.9;">${props.instructor}</div>` : ''}
              ${props.room ? `<div style="font-size: 9px; opacity: 0.7;">Room: ${props.room}</div>` : ''}
            </div>`;
        }
        
        return { html: contentHtml };
      },
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
              .map((event) => {
                // Format time for display
                const fromTime = event.from_time.substring(0, 5);
                const toTime = event.to_time.substring(0, 5);
                const isBreak = event.course && (event.course.includes("Break") || event.course.includes("Lunch"));
                
                return {
                  id: event.name,
                  title: event.course,
                  start: `${event.schedule_date}T${event.from_time}`,
                  end: `${event.schedule_date}T${event.to_time}`,
                  classNames: isBreak ? ["break-event"] : [],
                  extendedProps: {
                    course: event.course,
                    instructor: event.instructor_name || event.instructor,
                    student_group: event.student_group,
                    room: event.room,
                    program: event.program,
                    timeDisplay: `${fromTime} - ${toTime}`,
                  },
                };
              });
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

  // Helper to convert 24h time string to minutes for comparison
  function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  // Helper to convert 12h time string to minutes
  function time12ToMinutes(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Helper to get day name from date
  function getDayName(dateStr) {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  function generatePrintableTimetable(filter_type, filter_value) {
    let args = {};
    
    if (filter_type === "instructor" && filter_value) {
      args.instructor = filter_value;
    } else if (filter_type === "stream" && filter_value) {
      args.stream = filter_value;
    }
    
    if (selectedLevel) {
      args.level = selectedLevel;
    }
    
    frappe.call({
      method:
        "education.education.api.get_course_schedule",
      args: args,
      callback: function (response) {
        let schedules = response.message || [];

        let weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

        // Pre-Primary time slots (using 24h format internally for matching)
        let prePrimaryTimeSlots = [
          { start: "07:40", end: "08:15", label: "Breakfast", display: "7:40 - 8:15 AM" },
          { start: "08:15", end: "09:00", display: "8:15 - 9:00 AM" },
          { start: "09:00", end: "09:45", display: "9:00 - 9:45 AM" },
          { start: "09:45", end: "10:30", label: "First Break", display: "9:45 - 10:30 AM" },
          { start: "10:30", end: "11:15", display: "10:30 - 11:15 AM" },
          { start: "11:15", end: "11:30", display: "11:15 - 11:30 AM" },
          { start: "11:30", end: "11:45", label: "Second Break", display: "11:30 - 11:45 AM" },
          { start: "11:45", end: "12:30", display: "11:45 - 12:30 PM" },
          { start: "12:30", end: "13:20", label: "Lunch", display: "12:30 - 1:20 PM" },
          { start: "13:20", end: "14:15", display: "1:20 - 2:15 PM" },
          { start: "14:15", end: "15:00", display: "2:15 - 3:00 PM" },
        ];

        let primaryTimeSlots = [
          { start: "06:45", end: "07:40", display: "6:45 - 7:40 AM" },
          { start: "07:40", end: "08:10", label: "Breakfast", display: "7:40 - 8:10 AM" },
          { start: "08:10", end: "08:55", display: "8:10 - 8:55 AM" },
          { start: "08:55", end: "09:40", display: "8:55 - 9:40 AM" },
          { start: "09:40", end: "09:50", label: "First Break", display: "9:40 - 9:50 AM" },
          { start: "09:50", end: "10:35", display: "9:50 - 10:35 AM" },
          { start: "10:35", end: "11:20", display: "10:35 - 11:20 AM" },
          { start: "11:20", end: "11:30", label: "Second Break", display: "11:20 - 11:30 AM" },
          { start: "11:30", end: "12:15", display: "11:30 AM - 12:15 PM" },
          { start: "12:15", end: "13:00", display: "12:15 - 1:00 PM" },
          { start: "13:00", end: "13:45", label: "Lunch", display: "1:00 - 1:45 PM" },
          { start: "13:45", end: "13:55", display: "1:45 - 1:55 PM" },
          { start: "13:55", end: "14:40", display: "1:55 - 2:40 PM" },
          { start: "14:40", end: "15:25", display: "2:40 - 3:25 PM" },
          { start: "15:25", end: "16:10", display: "3:25 - 4:10 PM" },
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

        // Group schedules by day and time for aggregation (a weekly view consolidates schedules)
        let schedulesByDayTime = {};
        schedules.forEach((schedule) => {
          let dayName = getDayName(schedule.schedule_date);
          let fromTime = schedule.from_time.substring(0, 5); // Get HH:MM
          let key = `${dayName}_${fromTime}`;
          if (!schedulesByDayTime[key]) {
            schedulesByDayTime[key] = schedule;
          }
        });

        let tableHTML = `
                <h3 class="text-center" style="margin-bottom: 20px; font-family: Arial, sans-serif;">${title}</h3>
                <div style="overflow-x: auto; max-width: 100%;">
                    <table class="timetable-table" style="width: 100%; min-width: 800px; border-collapse: collapse; font-family: Arial, sans-serif;">
                        <thead>
                            <tr style="background-color: #f0f0f0; color: #333;">
                                <th style="width: 70px; text-align: center; padding: 10px; font-weight: bold; border: 1px solid #ccc;">Day</th>
                                ${timeSlots
                                  .map(
                                    (slot) => `
                                    <th style="min-width: 70px; text-align: center; padding: 8px; font-size: 9px; border: 1px solid #ccc; ${slot.label ? 'background-color: #f0f0f0;' : ''}">
                                        ${slot.display.split(' - ')[0]}${slot.label ? `<br><small>${slot.label}</small>` : ''}
                                    </th>`,
                                  )
                                  .join("")}
                            </tr>
                        </thead>
                        <tbody>
                `;

        weekdays.forEach((day, dayIndex) => {
          let rowBg = dayIndex % 2 === 0 ? '#fafafa' : '#ffffff';
          tableHTML += `<tr><td style="text-align: center; font-weight: bold; padding: 10px; border: 1px solid #ddd; background-color: ${rowBg}; color: #333;">${day}</td>`;

          timeSlots.forEach((slot) => {
            // Check if this slot is a predefined break or meal time
            if (slot.label) {
              tableHTML += `<td style="text-align: center; background-color: #ffeef0; font-size: 10px; padding: 6px; border: 1px solid #ddd;">
                <span style="font-weight: 600; color: #c00;">${slot.label}</span>
              </td>`;
              return;
            }

            // Find schedule that matches this day and time slot
            let slotStartMinutes = timeToMinutes(slot.start);
            let slotEndMinutes = timeToMinutes(slot.end);
            
            let matchedSchedule = schedules.find((schedule) => {
              let scheduleDay = getDayName(schedule.schedule_date);
              if (scheduleDay !== day) return false;
              
              // Get schedule time in minutes
              let scheduleFromMinutes = timeToMinutes(schedule.from_time);
              
              // Check if schedule falls within this time slot (with some tolerance)
              return Math.abs(scheduleFromMinutes - slotStartMinutes) <= 10;
            });

            if (matchedSchedule) {
              let displayText = matchedSchedule.course || '';
              let secondaryText = '';

              if (showInstructor && matchedSchedule.instructor_name) {
                secondaryText = matchedSchedule.instructor_name;
              } else if (showStudentGroup && matchedSchedule.student_group) {
                secondaryText = matchedSchedule.student_group;
              } else if (matchedSchedule.instructor_name) {
                secondaryText = matchedSchedule.instructor_name;
              }

              tableHTML += `<td style="text-align: center; padding: 4px; border: 1px solid #ddd; background-color: white;">
                <div style="font-weight: 600; font-size: 10px; color: #333;">${displayText}</div>
                ${secondaryText ? `<div style="font-size: 9px; color: #666; margin-top: 2px;">${secondaryText}</div>` : ''}
              </td>`;
            } else {
              tableHTML += `<td style="border: 1px solid #ddd; background-color: ${rowBg};"></td>`;
            }
          });

          tableHTML += `</tr>`;
        });

        tableHTML += `</tbody></table></div>
        <div style="margin-top: 15px; font-size: 10px; color: #666; text-align: center;">
            Generated on ${new Date().toLocaleDateString()} | ${selectedLevel ? selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1) : 'All Levels'} School
        </div>`;

        let printableDiv = document.getElementById("printable-timetable");
        printableDiv.innerHTML = tableHTML;
        printableDiv.classList.remove("d-none");
        showPreview();
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

  // Print function - shows preview first
  function showTimetablePreview() {
    let printContent = document.getElementById("printable-timetable").innerHTML;
    document.getElementById("timetable-preview-content").innerHTML = printContent;
    $("#timetablePreviewModal").modal("show");
  }

  // Print from preview modal
  $("#btn-print-timetable").on("click", function () {
    let printContent = document.getElementById("timetable-preview-content").innerHTML;
    let newWindow = window.open("", "", "width=1200,height=800");
    newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>School Timetable</title>
                <style>
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    html, body {
                        margin: 0;
                        padding: 15px;
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 10px;
                        width: 100%;
                        background: white;
                    }
                    h3 {
                        text-align: center;
                        margin: 0 0 15px 0;
                        font-size: 18px;
                        color: #333;
                        font-weight: 600;
                    }
                    .timetable-wrapper {
                        width: 100%;
                        overflow-x: visible;
                    }
                    .timetable-table {
                        width: 100%;
                        border-collapse: collapse;
                        page-break-inside: avoid;
                        table-layout: fixed;
                    }
                    .timetable-table th {
                        background-color: #f0f0f0 !important;
                        color: #333 !important;
                        font-weight: bold;
                        padding: 8px 4px;
                        text-align: center;
                        font-size: 9px;
                        border: 1px solid #ccc;
                    }
                    .timetable-table td {
                        border: 1px solid #ddd;
                        padding: 4px;
                        text-align: center;
                        vertical-align: middle;
                        font-size: 8px;
                    }
                    .timetable-table td.break-cell {
                        background-color: #ffeef0 !important;
                        color: #c00;
                        font-weight: 600;
                    }
                    .timetable-table td.day-cell {
                        background-color: #f5f5f5 !important;
                        font-weight: bold;
                        width: 70px;
                    }
                    .timetable-table tr:nth-child(even) td:not(.break-cell) {
                        background-color: #fafafa;
                    }
                    .footer {
                        margin-top: 15px;
                        font-size: 9px;
                        color: #666;
                        text-align: center;
                    }
                    @page {
                        size: landscape;
                        margin: 10mm;
                    }
                    @media print {
                        html, body {
                            width: auto !important;
                            margin: 0;
                            padding: 10px;
                        }
                        .timetable-wrapper {
                            width: 100% !important;
                            overflow: visible !important;
                        }
                        .timetable-table {
                            width: 100% !important;
                            table-layout: fixed;
                        }
                        .timetable-table th, .timetable-table td {
                            padding: 3px !important;
                            font-size: 7px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="timetable-wrapper">
                    ${printContent}
                </div>
            </body>
            </html>
        `);
    newWindow.document.close();
    setTimeout(() => newWindow.print(), 400);
  });

  // Show preview when clicking print button
  function showPreview() {
    let printContent = document.getElementById("printable-timetable").innerHTML;
    document.getElementById("timetable-preview-content").innerHTML = printContent;
    $("#timetablePreviewModal").modal("show");
  }
};
