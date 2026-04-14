<template>
  <div class="relative" ref="rootEl">
    <button
      type="button"
      class="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
      :aria-label="`Notifications${unreadCount ? `, ${unreadCount} new` : ''}`"
      @click="open = !open"
    >
      <FeatherIcon name="bell" class="w-4.5 h-4.5 text-gray-700" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b">
          <h3 class="text-sm font-semibold text-gray-900">Notifications</h3>
          <button
            v-if="items.length > 0"
            type="button"
            class="text-xs text-gray-500 hover:text-gray-700"
            @click="markAllRead"
          >
            Mark all read
          </button>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <div v-if="loading && items.length === 0" class="p-4 space-y-3">
            <div v-for="n in 3" :key="n" class="flex gap-3">
              <Skeleton class="w-8 h-8 rounded-lg" />
              <div class="flex-1 space-y-1.5">
                <Skeleton class="h-3 w-3/4" />
                <Skeleton class="h-3 w-1/2" />
              </div>
            </div>
          </div>

          <div
            v-else-if="items.length === 0"
            class="px-4 py-10 text-center"
          >
            <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <FeatherIcon name="bell-off" class="w-5 h-5 text-gray-400" />
            </div>
            <p class="text-sm text-gray-500">You're all caught up</p>
          </div>

          <ul v-else class="divide-y divide-gray-100">
            <li
              v-for="item in items"
              :key="item.id"
              class="hover:bg-gray-50 cursor-pointer"
              @click="handleClick(item)"
            >
              <div class="flex gap-3 p-3">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  :class="severityBg(item.severity)"
                >
                  <FeatherIcon
                    :name="item.icon || 'bell'"
                    class="w-4 h-4"
                    :class="severityIcon(item.severity)"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ item.title }}
                  </p>
                  <p class="text-xs text-gray-600 mt-0.5 line-clamp-2">
                    {{ item.message }}
                  </p>
                  <p v-if="item.timestamp" class="text-[11px] text-gray-400 mt-1">
                    {{ formatTime(item.timestamp) }}
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { FeatherIcon } from 'frappe-ui'
import Skeleton from '@/components/Skeleton.vue'
import { studentStore } from '@/stores/student'

const router = useRouter()
const store = studentStore()
const { notifications } = storeToRefs(store)
const { notificationsResource } = store

const open = ref(false)
const rootEl = ref(null)
const readIds = ref(new Set(loadReadIds()))

const items = computed(() => notifications.value || [])
const loading = computed(() => notificationsResource.loading)

const unreadCount = computed(
  () => items.value.filter((n) => !readIds.value.has(n.id)).length
)

function loadReadIds() {
  try {
    const raw = localStorage.getItem('student-portal:read-notifications')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistReadIds() {
  try {
    localStorage.setItem(
      'student-portal:read-notifications',
      JSON.stringify(Array.from(readIds.value))
    )
  } catch {
    /* ignore */
  }
}

function markAllRead() {
  items.value.forEach((n) => readIds.value.add(n.id))
  readIds.value = new Set(readIds.value)
  persistReadIds()
}

function handleClick(item) {
  readIds.value.add(item.id)
  readIds.value = new Set(readIds.value)
  persistReadIds()
  open.value = false
  if (item.route) router.push(item.route)
}

function severityBg(sev) {
  return {
    high: 'bg-red-50',
    medium: 'bg-orange-50',
    low: 'bg-blue-50',
  }[sev] || 'bg-gray-100'
}
function severityIcon(sev) {
  return {
    high: 'text-red-600',
    medium: 'text-orange-600',
    low: 'text-blue-600',
  }[sev] || 'text-gray-600'
}

function formatTime(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

function onDocClick(e) {
  if (!open.value) return
  if (rootEl.value && !rootEl.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
})

// Prune read IDs that no longer correspond to live notifications
watch(items, (list) => {
  if (!list?.length) return
  const live = new Set(list.map((n) => n.id))
  let changed = false
  for (const id of readIds.value) {
    if (!live.has(id)) {
      readIds.value.delete(id)
      changed = true
    }
  }
  if (changed) {
    readIds.value = new Set(readIds.value)
    persistReadIds()
  }
})
</script>
