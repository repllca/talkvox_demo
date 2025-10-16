import { useEffect, useRef, useState } from 'react'

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setIsActive(true)
        }
      } catch (err) {
        console.error('カメラ起動エラー:', err)
        setError('カメラを起動できませんでした。')
      }
    }

    startCamera()

    // コンポーネントが消えた時にカメラ停止
    return () => {
      const tracks = (videoRef.current?.srcObject as MediaStream)?.getTracks()
      tracks?.forEach(track => track.stop())
    }
  }, [])

  return { videoRef, isActive, error }
}
