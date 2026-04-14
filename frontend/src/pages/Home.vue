<template>
  <div class="p-5 space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p class="text-gray-500 text-sm mt-1">Welcome back, {{ studentName }}</p>
      </div>
      <DashboardNotifications />
    </div>

    <!-- Outstanding fees alert -->
    <div v-if="hasOutstandingFees" class="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
      <FeatherIcon name="alert-circle" class="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
      <div class="flex-1 min-w-0">
        <p class="font-medium text-orange-800">Outstanding fees</p>
        <p class="text-sm text-orange-700">
          You have <strong>{{ currencySymbol }} {{ totalOutstandingFees.toLocaleString() }}</strong> in unpaid fees.
        </p>
      </div>
      <Button variant="solid" size="sm" @click="router.push('/fees')">View fees</Button>
    </div>

    <!-- Stat cards -->
    <DashboardStats />

    <!-- Today's schedule -->
    <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b flex items-center justify-between">
        <h2 class="font-medium text-gray-900">Today's schedule</h2>
        <button
          type="button"
          class="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
          @click="router.push('/schedule')"
        >
          View all
          <FeatherIcon name="arrow-right" class="w-3.5 h-3.5" />
        </button>
      </div>

      <div v-if="dashboardLoading" class="divide-y divide-gray-100">
        <div v-for="n in 3" :key="n" class="p-4 flex items-center gap-4">
          <Skeleton class="h-10 w-16" />
          <div class="flex-1 space-y-2">
            <Skeleton class="h-4 w-32" />
            <Skeleton class="h-3 w-24" />
          </div>
          <Skeleton class="h-3 w-16" />
        </div>
      </div>

      <div v-else-if="todaySchedule.length > 0" class="divide-y divide-gray-100">
        <div
          v-for="item in todaySchedule"
          :key="item.name"
          class="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
          @click="router.push('/schedule')"
        >
          <div
            class="text-center min-w-[64px] py-1.5 px-2 rounded-lg"
            :style="item.class_schedule_color ? `background-color: ${item.class_schedule_color}1A` : ''"
          >
            <p
              class="text-sm font-semibold"
              :style="item.class_schedule_color ? `color: ${item.class_schedule_color}` : ''"
            >
              {{ item.display_time || formatTime(item.from_time) }}
            </p>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-gray-900 font-medium truncate">{{ item.title || item.course }}</p>
            <p v-if="item.instructor" class="text-gray-500 text-sm truncate">{{ item.instructor }}</p>
          </div>
          <div v-if="item.room" class="text-right shrink-0">
            <p class="text-gray-500 text-sm">Room {{ item.room }}</p>
          </div>
        </div>
      </div>

      <div v-else class="px-6 py-10 text-center">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <FeatherIcon name="calendar" class="w-5 h-5 text-gray-400" />
        </div>
        <p class="text-sm text-gray-700 font-medium">No classes scheduled for today</p>
        <p class="text-xs text-gray-500 mt-1">Enjoy your day off!</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Button, FeatherIcon } from 'frappe-ui'
import { studentStore } from '@/stores/student'
import DashboardStats from '@/components/DashboardStats.vue'
import DashboardNotifications from '@/components/DashboardNotifications.vue'
import Skeleton from '@/components/Skeleton.vue'

const router = useRouter()
const store = studentStore()
const { dashboardData } = storeToRefs(store)
const {
  getStudentInfo,
  student,
  fetchFees,
  fetchDashboard,
  fetchNotifications,
  dashboard,
} = store

const studentName = computed(() => {
  const info = getStudentInfo().value
  return info?.first_name || info?.student_name || 'Student'
})

const dashboardLoading = computed(() => dashboard.loading || !dashboardData.value)
const todaySchedule = computed(() => dashboardData.value?.today_schedule || [])

const hasOutstandingFees = computed(() => (dashboardData.value?.outstanding_fees || 0) > 0)
const totalOutstandingFees = computed(() => dashboardData.value?.outstanding_fees || 0)
const currencySymbol = computed(() => dashboardData.value?.currency || 'KES')

const formatTime = (t) => (t ? String(t).slice(0, 5) : '')

onMounted(async () => {
  await student.fetch()
  fetchFees()
  fetchDashboard()
  fetchNotifications()
})
</script>
