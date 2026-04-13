import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createResource } from 'frappe-ui'

export const studentStore = defineStore('education-student', () => {
  const studentInfo = ref({})
  const currentProgram = ref({})
  const studentGroups = ref([])
  const feesData = ref({})
  const attendanceData = ref({})

  const student = createResource({
    url: 'education.education.api.get_student_info',
    onSuccess(info) {
      if (!info) {
        window.location.href = '/app'
      }
      currentProgram.value = info.current_program
      // remove current_program from info
      delete info.current_program
      studentGroups.value = info.student_groups || []
      delete info.student_groups
      studentInfo.value = info
    },
    onError(err) {
      console.error(err)
    },
  })

  // Fetch fees data
  const fees = createResource({
    url: 'education.education.api.get_student_invoices',
    params: () => ({ student: studentInfo.value?.name }),
    onSuccess(data) {
      feesData.value = data
    },
    auto: false,
  })

  // Fetch attendance data
  const attendance = createResource({
    url: 'education.education.api.get_student_attendance',
    params: () => ({ 
      student: studentInfo.value?.name,
      program: currentProgram.value?.program
    }),
    onSuccess(data) {
      attendanceData.value = data
    },
    auto: false,
  })

  function getStudentInfo() {
    return studentInfo
  }
  function getCurrentProgram() {
    return currentProgram
  }

  function getStudentGroups() {
    return studentGroups
  }

  // Computed properties
  const studentName = computed(() => {
    const info = studentInfo.value
    if (!info) return ''
    return info.first_name || info.student_name || 'Student'
  })

  const studentFullName = computed(() => {
    const info = studentInfo.value
    if (!info) return ''
    return info.student_name || `${info.first_name} ${info.last_name || ''}`.trim()
  })

  const studentImage = computed(() => {
    return studentInfo.value?.image || null
  })

  const hasOutstandingFees = computed(() => {
    if (!feesData.value?.invoices) return false
    return feesData.value.invoices.some(inv => 
      ['Unpaid', 'Overdue', 'Partly Paid', 'Draft'].includes(inv.status)
    )
  })

  const totalOutstandingFees = computed(() => {
    if (!feesData.value?.invoices) return 0
    return feesData.value.invoices
      .filter(inv => ['Unpaid', 'Overdue', 'Partly Paid', 'Draft'].includes(inv.status))
      .reduce((sum, inv) => sum + parseFloat(inv.amount?.replace(/[^0-9.-]/g, '') || 0), 0)
  })

  function fetchFees() {
    if (studentInfo.value?.name) {
      fees.fetch()
    }
  }

  function fetchAttendance() {
    if (studentInfo.value?.name && currentProgram.value?.program) {
      attendance.fetch()
    }
  }

  return {
    student,
    studentInfo,
    currentProgram,
    studentGroups,
    feesData,
    attendanceData,
    fees,
    attendance,
    getStudentInfo,
    getCurrentProgram,
    getStudentGroups,
    studentName,
    studentFullName,
    studentImage,
    hasOutstandingFees,
    totalOutstandingFees,
    fetchFees,
    fetchAttendance,
  }
})
