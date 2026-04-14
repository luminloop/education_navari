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
import { ref, computed, onMounted } from 'vue'
import { studentStore } from '@/stores/student'

const { getCurrentProgram, getStudentGroups, student } = studentStore()

const events = ref([])

// Fetch student info first, then schedule
onMounted(async () => {
  await student.fetch()
  scheduleResource.fetch()
})

// Use computed to get reactive values from store
const programName = computed(() => {
  const program = getCurrentProgram().value
  return program?.program || null
})

const studentGroupList = computed(() => {
  return getStudentGroups().value || []
})

// Create resource with computed values
const scheduleResource = createResource({
  url: 'education.education.api.get_course_schedule_for_student',
  params: () => ({
    program_name: programName.value,
    student_groups: studentGroupList.value,
  }),
  onSuccess: (response) => {
    let schedule = []
    response.forEach((classSchedule) => {
      schedule.push({
        id: classSchedule.name,
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
  auto: false,
})
</script>

<style></style>
