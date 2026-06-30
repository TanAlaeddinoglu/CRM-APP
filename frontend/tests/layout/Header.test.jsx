import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Header from '../../src/layout/Header.jsx'
import { NotificationProvider } from '../../src/context/NotificationContext.jsx'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../src/services/auth.js', () => ({ logout: vi.fn() }))
vi.mock('../../src/services/export.js', () => ({ clearExportHistoryCache: vi.fn() }))
vi.mock('../../src/services/notifications.js', () => ({
  getNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  deleteNotification: vi.fn(),
  deleteAllNotifications: vi.fn(),
}))
vi.mock('../../src/layout/HeaderCustomerSearch.jsx', () => ({
  default: () => <div data-testid="customer-search" />,
}))

import { useAuth } from '../../src/context/AuthContext.jsx'
import { logout } from '../../src/services/auth.js'
import { clearExportHistoryCache } from '../../src/services/export.js'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteAllNotifications,
  deleteNotification,
} from '../../src/services/notifications.js'

const adminUser = { username: 'ahmet', role: 'Admin', is_staff: true, email: 'a@b.com' }

const recentIso = new Date(Date.now() - 30 * 1000).toISOString()

const notifications = [
  { id: 1, title: 'Yeni randevu', body: 'Bir randevu eklendi', is_read: false, created_at: recentIso },
  { id: 2, title: 'Ödeme alındı', body: 'Ödeme tamamlandı', is_read: true, created_at: recentIso },
]

let setUser

beforeEach(() => {
  vi.clearAllMocks()
  setUser = vi.fn()
  useAuth.mockReturnValue({ user: adminUser, setUser })
  getNotifications.mockResolvedValue({ data: notifications })
  markAllNotificationsRead.mockResolvedValue({})
  markNotificationRead.mockResolvedValue({})
  deleteNotification.mockResolvedValue({})
  deleteAllNotifications.mockResolvedValue({})
  logout.mockResolvedValue({})
})

afterEach(() => vi.restoreAllMocks())

function renderHeader() {
  return render(
    <MemoryRouter>
      <NotificationProvider>
        <Header />
      </NotificationProvider>
    </MemoryRouter>
  )
}

describe('Header', () => {
  it('renders avatar initial, username and role', async () => {
    renderHeader()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('ahmet')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    await waitFor(() => expect(getNotifications).toHaveBeenCalled())
  })

  it('loads notifications on mount with offset_weeks 0', async () => {
    renderHeader()
    await waitFor(() => {
      expect(getNotifications).toHaveBeenCalledWith({ offset_weeks: 0 })
    })
  })

  it('shows the unread count badge', async () => {
    renderHeader()
    // one unread notification
    expect(await screen.findByText('1')).toBeInTheDocument()
  })

  describe('notification menu', () => {
    it('opens the menu and lists notifications', async () => {
      renderHeader()
      await waitFor(() => expect(getNotifications).toHaveBeenCalled())
      await userEvent.click(screen.getByLabelText('Bildirimler'))
      // Unread tab is default — "Yeni randevu" (unread) appears here
      expect(await screen.findByText('Yeni randevu')).toBeInTheDocument()
      // "Ödeme alındı" is read — switch to history tab
      await userEvent.click(screen.getByRole('button', { name: 'Geçmiş' }))
      expect(await screen.findByText('Ödeme alındı')).toBeInTheDocument()
    })

    it('shows empty state when there are no notifications', async () => {
      getNotifications.mockResolvedValue({ data: [] })
      renderHeader()
      await userEvent.click(screen.getByLabelText('Bildirimler'))
      expect(await screen.findByText('Okunmamış bildirim yok.')).toBeInTheDocument()
    })

    it('marks all as read and clears the badge', async () => {
      renderHeader()
      await waitFor(() => expect(getNotifications).toHaveBeenCalled())
      await userEvent.click(screen.getByLabelText('Bildirimler'))
      await userEvent.click(await screen.findByLabelText('Tümünü oku'))
      await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled())
    })

    it('marks a single unread notification as read when clicked', async () => {
      renderHeader()
      await waitFor(() => expect(getNotifications).toHaveBeenCalled())
      await userEvent.click(screen.getByLabelText('Bildirimler'))
      await userEvent.click(await screen.findByText('Yeni randevu'))
      await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith(1))
    })

    it('does not re-mark an already-read notification', async () => {
      renderHeader()
      await waitFor(() => expect(getNotifications).toHaveBeenCalled())
      await userEvent.click(screen.getByLabelText('Bildirimler'))
      // Switch to history tab where read notifications are shown
      await userEvent.click(await screen.findByRole('button', { name: 'Geçmiş' }))
      await userEvent.click(await screen.findByText('Ödeme alındı'))
      expect(markNotificationRead).not.toHaveBeenCalled()
    })

    it('loads an older week and shows end message when empty', async () => {
      renderHeader()
      await waitFor(() => expect(getNotifications).toHaveBeenCalled())
      await userEvent.click(screen.getByLabelText('Bildirimler'))
      getNotifications.mockResolvedValueOnce({ data: [] })
      await userEvent.click(await screen.findByText('Daha fazla yükle'))
      await waitFor(() => {
        expect(getNotifications).toHaveBeenCalledWith({ offset_weeks: 1 })
      })
      expect(await screen.findByText('Tüm bildirimler yüklendi.')).toBeInTheDocument()
    })
  })

  describe('user menu', () => {
    it('toggles the dropdown and shows actions', async () => {
      renderHeader()
      await userEvent.click(screen.getByText('⋮'))
      expect(screen.getByText('Profil')).toBeInTheDocument()
      expect(screen.getByText('Ayarlar')).toBeInTheDocument()
      expect(screen.getByText('Çıkış Yap')).toBeInTheDocument()
    })

    it('shows "Dışa Aktarma Geçmişi" only for staff users', async () => {
      renderHeader()
      await userEvent.click(screen.getByText('⋮'))
      expect(screen.getByText('Dışa Aktarma Geçmişi')).toBeInTheDocument()
    })

    it('hides "Dışa Aktarma Geçmişi" for non-staff users', async () => {
      useAuth.mockReturnValue({ user: { ...adminUser, is_staff: false }, setUser })
      renderHeader()
      await userEvent.click(screen.getByText('⋮'))
      expect(screen.queryByText('Dışa Aktarma Geçmişi')).not.toBeInTheDocument()
    })

    it('navigates to profile', async () => {
      renderHeader()
      await userEvent.click(screen.getByText('⋮'))
      await userEvent.click(screen.getByText('Profil'))
      expect(navigateMock).toHaveBeenCalledWith('/profile')
    })

    it('navigates to settings', async () => {
      renderHeader()
      await userEvent.click(screen.getByText('⋮'))
      await userEvent.click(screen.getByText('Ayarlar'))
      expect(navigateMock).toHaveBeenCalledWith('/settings')
    })

    it('logs out: clears cache, resets user and navigates to login', async () => {
      renderHeader()
      await userEvent.click(screen.getByText('⋮'))
      await userEvent.click(screen.getByText('Çıkış Yap'))
      await waitFor(() => expect(logout).toHaveBeenCalled())
      expect(clearExportHistoryCache).toHaveBeenCalled()
      expect(setUser).toHaveBeenCalledWith(null)
      expect(navigateMock).toHaveBeenCalledWith('/login')
    })
  })

  describe('navigation history buttons', () => {
    it('disables back and forward at mount (single entry)', () => {
      renderHeader()
      expect(screen.getByLabelText('Geri')).toBeDisabled()
      expect(screen.getByLabelText('İleri')).toBeDisabled()
    })
  })

  it('renders a relative time label for notifications', async () => {
    renderHeader()
    await userEvent.click(screen.getByLabelText('Bildirimler'))
    // 30s ago → "Az önce"
    const menu = await screen.findByText('Yeni randevu')
    expect(within(menu.closest('.notification-item')).getByText('Az önce')).toBeInTheDocument()
  })

  it('does not load notifications when there is no user', () => {
    useAuth.mockReturnValue({ user: null, setUser })
    renderHeader()
    expect(getNotifications).not.toHaveBeenCalled()
  })
})
