import { useEffect } from 'react'
import { useCamera } from '../hooks/useCamera'

const API_URL = 'http://localhost:8000/frame'

export const CameraFeed = () => {
  const { videoRef, isActive, error } = useCamera()

  useEffect(() => {
    if (!isActive || !videoRef.current) return

    const sendFrame = async () => {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0)
      const blob = await new Promise<Blob | null>(res =>
        canvas.toBlob(res, 'image/jpeg')
      )
      if (!blob) return

      const formData = new FormData()
      formData.append('frame', blob, 'frame.jpg')

      try {
        await fetch(API_URL, {
          method: 'POST',
          body: formData,
        })
      } catch (err) {
        console.warn('送信失敗:', err)
      }
    }

    const interval = setInterval(sendFrame, 200)
    return () => clearInterval(interval)
  }, [isActive])

  return (
    <div className="camera-container">
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
