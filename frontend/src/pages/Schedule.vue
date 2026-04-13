<template>
  <div class="w-full h-full">
    <div v-if="scheduleResource.loading" class="flex items-center justify-center h-full">
      <div class="text-gray-500">Loading schedule...</div>
    </div>
    <Calendar
      v-else-if="scheduleResource.data && events.length > 0"
      :events="events"
    />
    <div v-else class="flex items-center justify-center h-full">
      <div class="text-gray-500 text-center">
        <p class="mb-2">No classes scheduled</p>
        <p class="text-sm">Contact your school administrator for timetable details</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import Calendar from '@/components/Calendar.vue'
import { createResource } from 'frappe-ui'
import { ref, watch } from 'vue'
import { studentStore } from '@/stores/student'

const { getCurrentProgram, getStudentGroups } = studentStore()

const events = ref([])

// Function to get current values from store
function getProgramName() {
  const program = getCurrentProgram()
  return program?.value?.program || null
}

function getStudentGroup() {
  return getStudentGroups().value || []
}

// Create resource with function that gets current values
const scheduleResource = createResource({
  url: 'education.education.api.get_course_schedule_for_student',
  params: () => ({
    program_name: getProgramName(),
    student_groups: getStudentGroup(),
  }),
  onSuccess: (response) => {
    let schedule = []
    response.forEach((classSchedule) => {
      schedule.push({
        title: classSchedule.title,
        with: classSchedule.instructor,
        name: classSchedule.name,
        room: classSchedule.room,
        date: classSchedule.schedule_date,
        from_time: classSchedule.from_time?.split('.')[0] || '',
        to_time: classSchedule.to_time?.split('.')[0] || '',
        color: classSchedule.class_schedule_color,
      })
    })
    events.value = schedule
  },
  auto: true,
})
</script>

<style></style>
