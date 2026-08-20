import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { StoreProvider } from './StoreContext.jsx'
import { useStore } from './useStore.js'

vi.mock('../lib/api', () => ({
  fetchMe: vi.fn(),
  loginCustomer: vi.fn(),
  logoutCustomer: vi.fn(),
  registerCustomer: vi.fn(),
}))

import { fetchMe, loginCustomer } from '../lib/api'

let values
function Probe() {
  values = useStore()
  return null
}

function renderProbe() {
  return render(
    <StoreProvider>
      <Probe />
    </StoreProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('StoreProvider', () => {
  it('is ready with no saved session and reports signed out', async () => {
    renderProbe()
    await waitFor(() => expect(values.authReady).toBe(true))
    expect(values.isAuthed).toBe(false)
    expect(values.token).toBeNull()
    expect(values.cartCount).toBe(0)
  })

  it('adds, adjusts and removes cart lines', () => {
    renderProbe()
    act(() => values.addToCart('p1'))
    expect(values.cartCount).toBe(1)
    expect(values.lines).toHaveLength(1)
    expect(values.subtotal).toBe(1499)
    expect(values.savings).toBe(400)

    act(() => values.addToCart('p1', 2))
    expect(values.cartCount).toBe(3)
    expect(values.subtotal).toBe(4497)

    act(() => values.setQty('p1', 1))
    expect(values.cartCount).toBe(1)
    expect(values.subtotal).toBe(1499)

    act(() => values.removeFromCart('p1'))
    expect(values.cart).toHaveLength(0)
    expect(values.cartCount).toBe(0)
    expect(values.subtotal).toBe(0)
  })

  it('ignores unknown products in the cart', () => {
    renderProbe()
    act(() => values.addToCart('does-not-exist'))
    expect(values.cart).toHaveLength(0)
    expect(values.cartCount).toBe(0)
  })

  it('toggles wishlist entries', () => {
    renderProbe()
    act(() => values.toggleWishlist('p1'))
    expect(values.wishlist).toEqual(['p1'])
    act(() => values.toggleWishlist('p1'))
    expect(values.wishlist).toEqual([])
  })

  it('adds multiple vehicles to the garage and activates the latest', () => {
    renderProbe()
    act(() => values.addVehicle('swift'))
    act(() => values.addVehicle('creta'))
    expect(values.garage).toEqual(['swift', 'creta'])
    expect(values.activeVehicle).toBe('creta')

    act(() => values.addVehicle('swift'))
    expect(values.garage).toEqual(['swift', 'creta'])
  })

  it('removes a vehicle and clears the active one when removed', () => {
    renderProbe()
    act(() => values.addVehicle('swift'))
    act(() => values.addVehicle('creta'))
    act(() => values.removeVehicle('creta'))
    expect(values.garage).toEqual(['swift'])
    expect(values.activeVehicle).toBe('swift')

    act(() => values.removeVehicle('swift'))
    expect(values.garage).toEqual([])
    expect(values.activeVehicle).toBe('')
  })

  it('persists the garage across reloads', () => {
    renderProbe()
    act(() => values.addVehicle('swift'))
    expect(JSON.parse(localStorage.getItem('meispare-garage'))).toEqual(['swift'])
    expect(localStorage.getItem('meispare-active-vehicle')).toBe('swift')

    localStorage.clear()
    localStorage.setItem('meispare-garage', JSON.stringify(['swift']))
    localStorage.setItem('meispare-active-vehicle', 'swift')
    renderProbe()
    expect(values.garage).toEqual(['swift'])
    expect(values.activeVehicle).toBe('swift')
  })

  it('adds to cart from a passed product object', () => {
    renderProbe()
    const product = { id: 'db-1', name: 'DB part', price: 950 }
    act(() => values.addToCart('db-1', 1, product))
    expect(values.cart).toEqual([{ productId: 'db-1', qty: 1, price: 950 }])
    expect(values.cartCount).toBe(1)
  })

  it('persists the cart across reloads', () => {
    renderProbe()
    act(() => values.addToCart('p1'))
    const stored = JSON.parse(localStorage.getItem('meispare-cart'))
    expect(stored).toEqual([{ productId: 'p1', qty: 1, price: 1499 }])

    localStorage.clear()
    const { unmount } = renderProbe()
    unmount()
    localStorage.setItem('meispare-cart', JSON.stringify(stored))
    renderProbe()
    expect(values.cart).toEqual(stored)
    expect(values.cartCount).toBe(1)
  })

  it('signs in, persists the session and reports authed', async () => {
    loginCustomer.mockResolvedValue({
      token: 't-123',
      customer: { id: 'c1', name: 'Ada', email: 'ada@example.com' },
    })
    renderProbe()
    await act(async () => {
      await values.signIn({ email: 'ada@example.com', password: 'secret' })
    })
    expect(values.isAuthed).toBe(true)
    expect(values.token).toBe('t-123')
    expect(values.customer.name).toBe('Ada')
    expect(JSON.parse(localStorage.getItem('meispare-auth')).token).toBe('t-123')
  })

  it('restores a saved session and refreshes the customer', async () => {
    localStorage.setItem(
      'meispare-auth',
      JSON.stringify({ token: 't-old', customer: null }),
    )
    fetchMe.mockResolvedValue({
      customer: { id: 'c1', name: 'Grace', email: 'grace@example.com' },
    })
    renderProbe()
    await waitFor(() => expect(values.authReady).toBe(true))
    expect(values.isAuthed).toBe(true)
    expect(values.customer.name).toBe('Grace')
  })

  it('clears a stale session when the server rejects it', async () => {
    localStorage.setItem(
      'meispare-auth',
      JSON.stringify({ token: 't-stale', customer: null }),
    )
    fetchMe.mockRejectedValue(new Error('Not signed in'))
    renderProbe()
    await waitFor(() => expect(values.authReady).toBe(true))
    expect(values.isAuthed).toBe(false)
    expect(localStorage.getItem('meispare-auth')).toBeNull()
  })
})
