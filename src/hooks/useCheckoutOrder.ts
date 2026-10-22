import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  connectWallet,
  disconnectWallet,
  createOrder,
  getOrders,
  type ConnectionInput,
  type OrderInput,
} from '@/api/orders'
import { ApiError } from '@/api/client'
import { useSession } from './useSession'
import { readToken } from '@/services/session'
import {
  readOrderAttempt,
  saveOrderAttempt,
  type OrderAttempt,
} from '@/services/order-attempt'

export function useCheckoutOrder() {
  const { session } = useSession()
  const token = session?.token ?? ''
  const userId = session?.user.id ?? ''
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const cache = useQueryClient()
  const navigate = useNavigate()
  const lock = useRef(false)
  const connectionLock = useRef(false)
  const [attempt, setAttempt] = useState(() => readOrderAttempt(userId))
  const connection = useMutation({
    mutationFn: (input: ConnectionInput) => connectWallet(token, input),
    retry: false,
    gcTime: 0,
    onSettled: () => {
      connectionLock.current = false
    },
  })
  const disconnect = useMutation({
    mutationFn: (id: string) => disconnectWallet(token, id),
    retry: false,
    gcTime: 0,
    onSuccess: () => connection.reset(),
  })
  const submission = useMutation({
    mutationFn: (value: OrderAttempt) =>
      createOrder(token, value.key, value.input),
    retry: false,
    gcTime: 0,
    onSuccess: (order) => {
      if (!alive.current || readToken() !== token) return
      saveOrderAttempt(userId, null)
      setAttempt(null)
      cache.setQueryData(
        ['private', userId, token, 'orders', 'detail', order.id],
        order,
      )
      void cache.invalidateQueries({
        queryKey: ['private', userId, token, 'demo-status'],
      })
      void navigate({ to: '/confirmation', search: { orderId: order.id } })
    },
    onError: async (error) => {
      if (!alive.current || readToken() !== token) return
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        try {
          const orders = await getOrders(token)
          const pending = orders.find((order) => order.status === 'pending')
          if (pending && alive.current && readToken() === token) {
            saveOrderAttempt(userId, null)
            setAttempt(null)
            void navigate({
              to: '/confirmation',
              search: { orderId: pending.id },
            })
            return
          }
          if (alive.current && readToken() === token) {
            saveOrderAttempt(userId, null)
            setAttempt(null)
            connection.reset()
          }
        } catch {
          return
        }
      }
      if (
        error instanceof ApiError &&
        [
          'CART_CHANGED',
          'STOCK_CHANGED',
          'COUPON_INVALID',
          'COUPON_EXPIRED',
          'VALIDATION',
          'FORBIDDEN',
          'NOT_FOUND',
        ].includes(error.code)
      ) {
        saveOrderAttempt(userId, null)
        setAttempt(null)
        connection.reset()
      }
      void cache.invalidateQueries({
        predicate: (query) => query.queryKey.includes('cart'),
      })
    },
    onSettled: () => {
      lock.current = false
    },
  })
  function send(value: OrderAttempt) {
    if (lock.current || !token) return
    lock.current = true
    saveOrderAttempt(userId, value)
    setAttempt(value)
    submission.mutate(value)
  }
  return {
    connection,
    disconnect,
    submission,
    attempt,
    connect: (input: ConnectionInput) => {
      if (connectionLock.current || !token) return
      connectionLock.current = true
      connection.mutate(input)
    },
    submit: (input: OrderInput) =>
      send(attempt ?? { key: crypto.randomUUID(), input }),
    recover: () => {
      if (attempt) send(attempt)
    },
  }
}
