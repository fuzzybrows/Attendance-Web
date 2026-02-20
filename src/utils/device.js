import FingerprintJS from '@fingerprintjs/fingerprintjs'

// Cache the promise to avoid reloading the agent multiple times
const fpPromise = FingerprintJS.load()

export const getDeviceId = async () => {
    try {
        const fp = await fpPromise
        const result = await fp.get()
        return result.visitorId
    } catch (error) {
        console.error('Failed to get device fingerprint:', error)
        // Fallback to a random UUID if fingerprint fails, stored in localStorage
        // This is a last resort to allow usage, even if less secure
        let fallbackId = localStorage.getItem('device_fallback_id')
        if (!fallbackId) {
            fallbackId = crypto.randomUUID()
            localStorage.setItem('device_fallback_id', fallbackId)
        }
        return `fallback-${fallbackId}`
    }
}
