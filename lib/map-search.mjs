import { normalizeGalleryText, matchesGallerySearch } from './public-gallery.mjs'
import { formatReportAddress } from './format-location.mjs'

export const MAP_LOCATIONS = [
  { name: 'Pasig City (All)', lat: 14.5802, lng: 121.0850 },
  { name: 'Ortigas Center', lat: 14.5862, lng: 121.0610 },
  { name: 'San Antonio', lat: 14.5815, lng: 121.0645 },
  { name: 'Kapasigan Plaza', lat: 14.5595, lng: 121.0805 },
  { name: 'Ugong North', lat: 14.5910, lng: 121.0760 },
  { name: 'Rosario / Tramo', lat: 14.5875, lng: 121.0920 },
  { name: 'Maybunga Riverbank', lat: 14.5775, lng: 121.0965 },
]

export function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return Infinity
  }
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function getNearestLandmark(lat, lng, maxDistanceKm = 3.5, locations = MAP_LOCATIONS) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const landmarks = locations
    .filter(l => l.name !== 'Pasig City (All)')
    .map(l => ({ ...l, dist: getDistanceKm(lat, lng, l.lat, l.lng) }))
    .sort((a, b) => a.dist - b.dist)

  if (landmarks.length > 0 && landmarks[0].dist <= maxDistanceKm) {
    return landmarks[0].name
  }
  return null
}

export function formatClusterPoi(cluster, locations = MAP_LOCATIONS) {
  if (!cluster) return null

  let lat = null
  let lng = null

  if (Array.isArray(cluster.coords) && cluster.coords.length === 2) {
    lat = Number(cluster.coords[0])
    lng = Number(cluster.coords[1])
  } else if (Number.isFinite(Number(cluster.centerLat)) && Number.isFinite(Number(cluster.centerLng))) {
    lat = Number(cluster.centerLat)
    lng = Number(cluster.centerLng)
  } else if (Number.isFinite(Number(cluster.lat)) && Number.isFinite(Number(cluster.lng))) {
    lat = Number(cluster.lat)
    lng = Number(cluster.lng)
  } else if (cluster.center) {
    const coords = cluster.center.coordinates || cluster.center
    if (Array.isArray(coords)) {
      lng = Number(coords[0])
      lat = Number(coords[1])
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const nearbyLandmark = getNearestLandmark(lat, lng, 3.5, locations)
  const rawIssue = (cluster.issue_type || 'Environmental').replace(/_/g, ' ')
  const issueFormatted = rawIssue
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  const count = Number(cluster.report_count) || (cluster.reports && cluster.reports.length) || 0

  const title = cluster.label
    ? cluster.label
    : nearbyLandmark
      ? `${issueFormatted} Cluster • ${nearbyLandmark}`
      : `${issueFormatted} Cluster`

  const subtitle = `${count} ${count === 1 ? 'report' : 'verified reports'} • ${cluster.severity || 'Normal'} priority`

  return {
    ...cluster,
    id: cluster.id,
    kind: 'Hotspot',
    title,
    subtitle,
    issue_type: cluster.issue_type,
    severity: cluster.severity,
    report_count: count,
    status: cluster.status || 'active',
    lat,
    lng,
    coords: [lat, lng],
    nearbyLandmark,
    raw: cluster,
  }
}

export function getItemSearchText(item) {
  if (!item) return ''
  const parts = [
    item.id,
    item.title,
    item.description,
    item.issue_type,
    item.street_address,
    item.barangay,
    item.city,
    item.address,
    item.nearby_landmark,
    item.nearbyLandmark,
    item.location_name,
    item.name,
    item.label,
    item.subtitle,
    item.category,
    item.keywords,
    item.status,
    item.severity,
    item.assigned_crew,
    item.assigned_crew_name,
    item.crew_name,
  ]

  if (item.street_address || item.barangay || item.city) {
    try {
      parts.push(formatReportAddress(item))
    } catch {}
  }

  return normalizeGalleryText(parts.filter(value => typeof value === 'string' || typeof value === 'number').join(' '))
}

export function findMapResults(items, query) {
  if (!query || !query.trim()) return []
  return items.filter(item => matchesGallerySearch(getItemSearchText(item), query))
}

export const PASIG_LANDMARKS_AND_ADDRESSES = [
  // Civic & Government Landmarks
  {
    name: 'Pasig City Hall',
    category: 'Civic',
    lat: 14.5587,
    lng: 121.0814,
    address: 'Caruncho Avenue, Barangay San Nicolas, Pasig City',
    keywords: 'city hall lgu government mayor caruncho ave san nicolas'
  },
  {
    name: 'Pasig City Hall of Justice',
    category: 'Civic',
    lat: 14.5583,
    lng: 121.0827,
    address: 'Caruncho Avenue, Barangay San Nicolas, Pasig City',
    keywords: 'hall of justice court legal fiscal caruncho'
  },
  {
    name: 'Pasig Mega Market',
    category: 'Civic',
    lat: 14.5594,
    lng: 121.0847,
    address: 'Market Avenue, Barangay San Nicolas, Pasig City',
    keywords: 'palengke wet market mega market bagsakan caruncho'
  },
  {
    name: 'Tanghalang Pasigueño',
    category: 'Civic',
    lat: 14.5574,
    lng: 121.0818,
    address: 'Caruncho Avenue, Barangay San Nicolas, Pasig City',
    keywords: 'theater auditorium cultural center caruncho'
  },
  {
    name: 'Pasig City Sports Center',
    category: 'Civic',
    lat: 14.5577,
    lng: 121.0834,
    address: 'Caruncho Avenue, Barangay San Nicolas, Pasig City',
    keywords: 'sports complex gym basketball arena caruncho'
  },
  {
    name: 'Pasig Cathedral (Immaculate Conception Cathedral)',
    category: 'Civic',
    lat: 14.5552,
    lng: 121.0820,
    address: 'Plaza Rizal, Barangay Malinao, Pasig City',
    keywords: 'cathedral church diocesan plaza rizal malinao catholic'
  },
  {
    name: 'Kapasigan Plaza',
    category: 'Civic',
    lat: 14.5595,
    lng: 121.0805,
    address: 'A. Mabini Street, Barangay Kapasigan, Pasig City',
    keywords: 'kapasigan plaza town square mabini st'
  },

  // Education & Academic Institutions
  {
    name: 'Pamantasan ng Lungsod ng Pasig (PLP Main Campus)',
    category: 'Education',
    lat: 14.5615,
    lng: 121.0776,
    address: 'Alcalde Jose Street, Barangay Kapasigan, Pasig City',
    keywords: 'plp pamantasan ng lungsod ng pasig university college alcalde jose'
  },
  {
    name: 'Rizal High School',
    category: 'Education',
    lat: 14.5714,
    lng: 121.0792,
    address: 'Dr. Sixto Antonio Avenue, Barangay Caniogan, Pasig City',
    keywords: 'rizal high school rhs largest high school caniogan sixto antonio'
  },
  {
    name: 'University of Asia and the Pacific (UA&P)',
    category: 'Education',
    lat: 14.5815,
    lng: 121.0601,
    address: 'Pearl Drive, Ortigas Center, Barangay San Antonio, Pasig City',
    keywords: 'uap university of asia and the pacific pearl drive ortigas'
  },
  {
    name: 'St. Paul College Pasig',
    category: 'Education',
    lat: 14.5828,
    lng: 121.0664,
    address: 'St. Paul Road, Barangay Ugong, Pasig City',
    keywords: 'st paul college school private ugong'
  },
  {
    name: 'Pasig Catholic College',
    category: 'Education',
    lat: 14.5562,
    lng: 121.0808,
    address: 'Justice Ramon Jabson Street, Barangay Malinao, Pasig City',
    keywords: 'pcc pasig catholic college malinao'
  },

  // Healthcare & Hospitals
  {
    name: 'The Medical City',
    category: 'Healthcare',
    lat: 14.5898,
    lng: 121.0692,
    address: 'Ortigas Avenue, Barangay Ugong Norte, Pasig City',
    keywords: 'tmc the medical city hospital medical center emergency ortigas ave'
  },
  {
    name: 'Rizal Medical Center',
    category: 'Healthcare',
    lat: 14.5651,
    lng: 121.0664,
    address: 'Pasig Boulevard, Barangay Bagong Ilog, Pasig City',
    keywords: 'rmc rizal medical center government hospital pasig blvd bagong ilog'
  },
  {
    name: 'Pasig City General Hospital',
    category: 'Healthcare',
    lat: 14.5878,
    lng: 121.0968,
    address: 'M. Eusebio Avenue, Barangay San Miguel, Pasig City',
    keywords: 'pcgh pasig city general hospital eusebio ave san miguel'
  },
  {
    name: 'Pasig City Children\'s Hospital (Child\'s Hope)',
    category: 'Healthcare',
    lat: 14.5623,
    lng: 121.0772,
    address: 'Alcalde Jose Street, Barangay Kapasigan, Pasig City',
    keywords: 'pcch child hope childrens hospital pediatric alcalde jose'
  },

  // Commercial Districts & Shopping
  {
    name: 'Ortigas Center',
    category: 'Commercial',
    lat: 14.5862,
    lng: 121.0610,
    address: 'San Antonio / Ugong, Pasig City',
    keywords: 'ortigas center cbd business district emerald ave f ortigas'
  },
  {
    name: 'Capitol Commons & Estancia Mall',
    category: 'Commercial',
    lat: 14.5755,
    lng: 121.0620,
    address: 'Meralco Avenue cor. Shaw Blvd, Barangay Oranbo, Pasig City',
    keywords: 'capitol commons estancia mall shaw blvd meralco ave oranbo'
  },
  {
    name: 'Tiendesitas & Frontera Verde',
    category: 'Commercial',
    lat: 14.5888,
    lng: 121.0792,
    address: 'Ortigas Avenue cor. E. Rodriguez Jr. Ave (C-5), Barangay Ugong, Pasig City',
    keywords: 'tiendesitas frontera verde c5 e rodriguez ortigas ave ugong'
  },
  {
    name: 'Ayala Malls The 30th',
    category: 'Commercial',
    lat: 14.5824,
    lng: 121.0648,
    address: '30 Meralco Avenue, Barangay Ugong, Pasig City',
    keywords: 'ayala malls the 30th meralco ave shopping cinema'
  },
  {
    name: 'Robinsons Galleria',
    category: 'Commercial',
    lat: 14.5902,
    lng: 121.0597,
    address: 'EDSA cor. Ortigas Avenue, Pasig City',
    keywords: 'robinsons galleria mall edsa ortigas avenue'
  },
  {
    name: 'SM City East Ortigas',
    category: 'Commercial',
    lat: 14.5885,
    lng: 121.1098,
    address: 'Ortigas Avenue Extension, Barangay Santa Lucia, Pasig City',
    keywords: 'sm city east ortigas extension sta lucia mall'
  },
  {
    name: 'Arcovia City',
    category: 'Commercial',
    lat: 14.5821,
    lng: 121.0768,
    address: 'Eulogio Rodriguez Jr. Avenue (C-5), Barangay Ugong, Pasig City',
    keywords: 'arcovia city arco de emperador c5 lifestyle township'
  },
  {
    name: 'Bridgetowne Destination Estate',
    category: 'Commercial',
    lat: 14.5937,
    lng: 121.0838,
    address: 'Amang Rodriguez Avenue / C-5, Barangay Rosario, Pasig City',
    keywords: 'bridgetowne victor statue amang rodriguez c5 rosario'
  },

  // Parks & Recreation
  {
    name: 'Pasig Rainforest Park (RAVE)',
    category: 'Recreation',
    lat: 14.5796,
    lng: 121.0967,
    address: 'F. Legaspi Street, Barangay Maybunga, Pasig City',
    keywords: 'rave pasig rainforest adventure experience park zoo waterpark legaspi maybunga'
  },
  {
    name: 'PhilSports Arena (ULTRA)',
    category: 'Recreation',
    lat: 14.5794,
    lng: 121.0642,
    address: 'Meralco Avenue, Barangay San Antonio, Pasig City',
    keywords: 'ultra philsports arena sports complex track oval meralco ave'
  },
  {
    name: 'Maybunga Riverbank Park',
    category: 'Recreation',
    lat: 14.5775,
    lng: 121.0965,
    address: 'Dr. Sixto Antonio Avenue, Barangay Maybunga, Pasig City',
    keywords: 'maybunga riverbank park greenway floodway'
  },

  // Major Thoroughfares & Avenues
  {
    name: 'Caruncho Avenue',
    category: 'Thoroughfare',
    lat: 14.5581,
    lng: 121.0825,
    address: 'Barangay San Nicolas & Kapasigan, Pasig City',
    keywords: 'caruncho avenue ave city hall sports center market'
  },
  {
    name: 'Ortigas Avenue',
    category: 'Thoroughfare',
    lat: 14.5870,
    lng: 121.0750,
    address: 'Ugong / Rosario, Pasig City',
    keywords: 'ortigas avenue ave main arterial highway c5'
  },
  {
    name: 'Shaw Boulevard',
    category: 'Thoroughfare',
    lat: 14.5780,
    lng: 121.0570,
    address: 'Kapitolyo / Oranbo, Pasig City',
    keywords: 'shaw boulevard blvd kapitolyo crossing'
  },
  {
    name: 'C-5 Road (Eulogio Rodriguez Jr. Ave)',
    category: 'Thoroughfare',
    lat: 14.5840,
    lng: 121.0725,
    address: 'Ugong / Bagong Ilog, Pasig City',
    keywords: 'c5 road c-5 eulogio rodriguez jr ave expressway thoroughfare'
  },
  {
    name: 'Mercedes Avenue',
    category: 'Thoroughfare',
    lat: 14.5630,
    lng: 121.0980,
    address: 'Barangay San Miguel, Pasig City',
    keywords: 'mercedes avenue ave san miguel warehouse district'
  },
  {
    name: 'Amang Rodriguez Avenue',
    category: 'Thoroughfare',
    lat: 14.6045,
    lng: 121.0940,
    address: 'Manggahan / Santolan / Rosario, Pasig City',
    keywords: 'amang rodriguez avenue ave manggahan santolan'
  },
  {
    name: 'Dr. Sixto Antonio Avenue',
    category: 'Thoroughfare',
    lat: 14.5760,
    lng: 121.0815,
    address: 'Caniogan / Maybunga / Rosario, Pasig City',
    keywords: 'dr sixto antonio avenue ave caniogan maybunga rizal high'
  },
  {
    name: 'Emerald Avenue',
    category: 'Thoroughfare',
    lat: 14.5844,
    lng: 121.0617,
    address: 'Ortigas Center, Barangay San Antonio, Pasig City',
    keywords: 'emerald avenue ave f ortigas open street sunday'
  },
  {
    name: 'Meralco Avenue',
    category: 'Thoroughfare',
    lat: 14.5800,
    lng: 121.0640,
    address: 'San Antonio / Oranbo / Ugong, Pasig City',
    keywords: 'meralco avenue ave subway ultra capitol commons'
  },
  {
    name: 'Pasig Boulevard',
    category: 'Thoroughfare',
    lat: 14.5670,
    lng: 121.0640,
    address: 'Bagong Ilog / Pineda, Pasig City',
    keywords: 'pasig boulevard blvd rizal medical center bagong ilog'
  },
  {
    name: 'Sandoval Avenue',
    category: 'Thoroughfare',
    lat: 14.5500,
    lng: 121.0930,
    address: 'Barangay Pinagbuhatan, Pasig City',
    keywords: 'sandoval avenue ave pinagbuhatan nagpayong'
  },

  // All 30 Official Pasig City Barangays
  { name: 'Barangay Bagong Ilog', category: 'Barangay', lat: 14.5685, lng: 121.0673, address: 'Barangay Bagong Ilog, Pasig City', keywords: 'bagong ilog barangay hall rmc pasig blvd' },
  { name: 'Barangay Bagong Katipunan', category: 'Barangay', lat: 14.5562, lng: 121.0792, address: 'Barangay Bagong Katipunan, Pasig City', keywords: 'bagong katipunan barangay hall' },
  { name: 'Barangay Bambang', category: 'Barangay', lat: 14.5528, lng: 121.0795, address: 'Barangay Bambang, Pasig City', keywords: 'bambang barangay hall' },
  { name: 'Barangay Buting', category: 'Barangay', lat: 14.5521, lng: 121.0683, address: 'Barangay Buting, Pasig City', keywords: 'buting barangay hall san joaquin border' },
  { name: 'Barangay Caniogan', category: 'Barangay', lat: 14.5719, lng: 121.0774, address: 'Barangay Caniogan, Pasig City', keywords: 'caniogan barangay hall rizal high sixto antonio' },
  { name: 'Barangay Dela Paz', category: 'Barangay', lat: 14.6152, lng: 121.0998, address: 'Barangay Dela Paz, Pasig City', keywords: 'dela paz barangay hall marcos highway santolan border' },
  { name: 'Barangay Kalawaan', category: 'Barangay', lat: 14.5476, lng: 121.0858, address: 'Barangay Kalawaan, Pasig City', keywords: 'kalawaan barangay hall riverbank' },
  { name: 'Barangay Kapasigan', category: 'Barangay', lat: 14.5595, lng: 121.0805, address: 'Barangay Kapasigan, Pasig City', keywords: 'kapasigan barangay hall plp plaza mabini' },
  { name: 'Barangay Kapitolyo', category: 'Barangay', lat: 14.5721, lng: 121.0583, address: 'Barangay Kapitolyo, Pasig City', keywords: 'kapitolyo barangay hall shaw dining culinary' },
  { name: 'Barangay Malinao', category: 'Barangay', lat: 14.5542, lng: 121.0831, address: 'Barangay Malinao, Pasig City', keywords: 'malinao barangay hall cathedral plaza rizal' },
  { name: 'Barangay Manggahan', category: 'Barangay', lat: 14.6002, lng: 121.0967, address: 'Barangay Manggahan, Pasig City', keywords: 'manggahan barangay hall amang rodriguez floodway' },
  { name: 'Barangay Maybunga', category: 'Barangay', lat: 14.5775, lng: 121.0965, address: 'Barangay Maybunga, Pasig City', keywords: 'maybunga barangay hall rave park floodway' },
  { name: 'Barangay Oranbo', category: 'Barangay', lat: 14.5776, lng: 121.0612, address: 'Barangay Oranbo, Pasig City', keywords: 'oranbo barangay hall capitol commons shaw blvd' },
  { name: 'Barangay Palatiw', category: 'Barangay', lat: 14.5583, lng: 121.0901, address: 'Barangay Palatiw, Pasig City', keywords: 'palatiw barangay hall market' },
  { name: 'Barangay Pinagbuhatan', category: 'Barangay', lat: 14.5527, lng: 121.0984, address: 'Barangay Pinagbuhatan, Pasig City', keywords: 'pinagbuhatan barangay hall nagpayong sandoval ave' },
  { name: 'Barangay Pineda', category: 'Barangay', lat: 14.5656, lng: 121.0543, address: 'Barangay Pineda, Pasig City', keywords: 'pineda barangay hall pasig river border' },
  { name: 'Barangay Rosario', category: 'Barangay', lat: 14.5875, lng: 121.0920, address: 'Barangay Rosario, Pasig City', keywords: 'rosario barangay hall tramo ortigas ave bridgetowne' },
  { name: 'Barangay Sagad', category: 'Barangay', lat: 14.5647, lng: 121.0829, address: 'Barangay Sagad, Pasig City', keywords: 'sagad barangay hall' },
  { name: 'Barangay San Antonio', category: 'Barangay', lat: 14.5815, lng: 121.0645, address: 'Barangay San Antonio, Pasig City', keywords: 'san antonio barangay hall ortigas center ultra meralco ave' },
  { name: 'Barangay San Joaquin', category: 'Barangay', lat: 14.5492, lng: 121.0754, address: 'Barangay San Joaquin, Pasig City', keywords: 'san joaquin barangay hall' },
  { name: 'Barangay San Jose', category: 'Barangay', lat: 14.5539, lng: 121.0803, address: 'Barangay San Jose, Pasig City', keywords: 'san jose barangay hall' },
  { name: 'Barangay San Miguel', category: 'Barangay', lat: 14.5663, lng: 121.0945, address: 'Barangay San Miguel, Pasig City', keywords: 'san miguel barangay hall mercedes ave pcgh' },
  { name: 'Barangay San Nicolas', category: 'Barangay', lat: 14.5589, lng: 121.0842, address: 'Barangay San Nicolas, Pasig City', keywords: 'san nicolas barangay hall city hall mega market caruncho' },
  { name: 'Barangay Santa Cruz', category: 'Barangay', lat: 14.5578, lng: 121.0872, address: 'Barangay Santa Cruz, Pasig City', keywords: 'santa cruz sta cruz barangay hall' },
  { name: 'Barangay Santa Lucia', category: 'Barangay', lat: 14.5862, lng: 121.1112, address: 'Barangay Santa Lucia, Pasig City', keywords: 'santa lucia sta lucia barangay hall sm east ortigas' },
  { name: 'Barangay Santa Rosa', category: 'Barangay', lat: 14.5518, lng: 121.0827, address: 'Barangay Santa Rosa, Pasig City', keywords: 'santa rosa sta rosa barangay hall' },
  { name: 'Barangay Santolan', category: 'Barangay', lat: 14.6128, lng: 121.0864, address: 'Barangay Santolan, Pasig City', keywords: 'santolan barangay hall lrt amang rodriguez' },
  { name: 'Barangay Santo Tomas', category: 'Barangay', lat: 14.5523, lng: 121.0869, address: 'Barangay Santo Tomas, Pasig City', keywords: 'santo tomas sto tomas barangay hall' },
  { name: 'Barangay Sumilang', category: 'Barangay', lat: 14.5502, lng: 121.0815, address: 'Barangay Sumilang, Pasig City', keywords: 'sumilang barangay hall' },
  { name: 'Barangay Ugong', category: 'Barangay', lat: 14.5882, lng: 121.0742, address: 'Barangay Ugong, Pasig City', keywords: 'ugong barangay hall c5 tiendesitas the 30th' },
]

/**
 * Dynamic forward address geocoding via Photon API bounded to Pasig City vicinity.
 * Gracefully falls back to empty array upon network failure or offline mode.
 */
export async function searchAddressGeocode(query, { signal, limit = 5 } = {}) {
  if (!query || typeof query !== 'string' || query.trim().length < 3) return []

  const cleanQuery = query.trim()
  const searchQuery = cleanQuery.toLowerCase().includes('pasig')
    ? cleanQuery
    : `${cleanQuery} Pasig`

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&lat=14.5802&lon=121.0850&limit=${limit}`

  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.features)) return []

    return data.features
      .filter(f => f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length >= 2)
      .map(f => {
        const [lon, lat] = f.geometry.coordinates
        const props = f.properties || {}
        const name = props.name || props.street || cleanQuery
        const street = props.street
        const housenumber = props.housenumber
        const district = props.district || props.suburb
        const city = props.city || 'Pasig City'

        const subtitleParts = []
        if (housenumber && street) {
          subtitleParts.push(`${housenumber} ${street}`)
        } else if (street && name !== street) {
          subtitleParts.push(street)
        }
        if (district) subtitleParts.push(district)
        if (city) subtitleParts.push(city)

        const subtitle = subtitleParts.join(', ') || 'Address in Pasig vicinity'

        return {
          id: `geocode-${props.osm_id || Math.random().toString(36).slice(2, 9)}`,
          kind: 'Location',
          name,
          title: name,
          subtitle,
          address: subtitle,
          category: props.osm_value === 'highway' ? 'Thoroughfare' : 'Address',
          coords: [lat, lon],
          lat,
          lng: lon,
          isGeocoded: true,
        }
      })
  } catch {
    return []
  }
}


