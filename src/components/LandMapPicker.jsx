import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

/** Default view (Bangladesh) before a pin exists */
const DEFAULT_CENTER = [23.8103, 90.4125]
const DEFAULT_ZOOM = 7
const PIN_ZOOM = 15

/**
 * Vite-friendly Leaflet marker icon (bundler breaks default asset paths).
 */
const pinIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

/**
 * Free map: OpenStreetMap tiles + Leaflet. No API key or billing.
 * Click to place/move pin; drag pin to fine-tune. Emits lat/lng as strings (6 decimals).
 */
export function LandMapPicker({ lat, lng, onChange, disabled }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const disabledRef = useRef(disabled)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  /** Create map once */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      DEFAULT_CENTER,
      DEFAULT_ZOOM
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    const handleClick = (e) => {
      if (disabledRef.current) return
      const la = e.latlng.lat
      const ln = e.latlng.lng
      onChangeRef.current(la.toFixed(6), ln.toFixed(6))
    }
    map.on('click', handleClick)

    mapRef.current = map

    // Leaflet needs a size after layout (e.g. inside accordions)
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.off('click', handleClick)
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
        markerRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
  }, [])

  /** Sync marker + view from props */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const parsedLat = parseFloat(lat)
    const parsedLng = parseFloat(lng)
    const hasPoint =
      !Number.isNaN(parsedLat) &&
      !Number.isNaN(parsedLng) &&
      lat !== '' &&
      lng !== ''

    if (!hasPoint) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
        markerRef.current = null
      }
      return
    }

    const pos = [parsedLat, parsedLng]

    if (!markerRef.current) {
      const m = L.marker(pos, {
        icon: pinIcon,
        draggable: !disabledRef.current,
      })
      m.addTo(map)
      m.on('dragend', () => {
        const p = m.getLatLng()
        onChangeRef.current(p.lat.toFixed(6), p.lng.toFixed(6))
      })
      markerRef.current = m
      map.setView(pos, PIN_ZOOM)
    } else {
      markerRef.current.setLatLng(pos)
      if (!map.getBounds().contains(markerRef.current.getLatLng())) {
        map.setView(pos, Math.max(map.getZoom(), 12))
      }
    }
  }, [lat, lng])

  /** Toggle dragging when `disabled` changes */
  useEffect(() => {
    const m = markerRef.current
    if (!m) return
    if (disabled) {
      if (m.dragging?.enabled()) m.dragging.disable()
    } else if (m.dragging && !m.dragging.enabled()) {
      m.dragging.enable()
    }
  }, [disabled])

  return (
    <div className="overflow-hidden rounded-[20px] border border-[#ebebeb] shadow-card">
      <div
        ref={containerRef}
        className="h-[320px] w-full rounded-t-[20px]"
        style={{ minHeight: 320 }}
      />
      <p className="border-t border-[#ebebeb] bg-white px-4 py-2 text-[13px] text-[#6a6a6a]">
        Free map (OpenStreetMap).{' '}
        {lat && lng
          ? 'Drag the pin or click the map to move the location.'
          : 'Click the map to place a pin.'}
      </p>
    </div>
  )
}
