import { useEffect, useRef } from 'react'
import { useCamera } from '../hooks/useCamera'

const WS_URL = 'ws://localhost:8000/ws' // WebSocketサーバーURL

export const CameraFeed = () => {
  const { videoRef, isActive, error } = useCamera()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!isActive || !videoRef.current) return

    // WebSocketを開く
    wsRef.current = new WebSocket(WS_URL)
    wsRef.current.onopen = () => console.log('WebSocket 接続開始')
    wsRef.current.onerror = err => console.error('WebSocket エラー:', err)
    wsRef.current.onclose = () => console.log('WebSocket 切断')

    const sendFrame = async () => {
      const video = videoRef.current!
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0)
      const blob = await new Promise<Blob | null>(res =>
        canvas.toBlob(res, 'image/jpeg', 0.7)
      )
      if (!blob) return

      // blob → ArrayBufferに変換して送信
      const buffer = await blob.arrayBuffer()
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(buffer)
      }
    }

    const interval = setInterval(sendFrame, 100) // 10fpsくらい
    return () => {
      clearInterval(interval)
      wsRef.current?.close()
    }
  }, [isActive])

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', borderRadius: '12px' }}
      />
    </div>
  )
}
