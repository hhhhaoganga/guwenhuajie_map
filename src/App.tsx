import React, { useEffect, useRef, useState } from 'react';
import spotsData from './data/spots.json';
import { MapPin, Search, Filter, X, ChevronUp, ChevronDown, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Define types for our spot data
interface Spot {
  id: number;
  name: string;
  location: string;
  address: string;
  type: string;
  isHeritage: boolean;
  description?: string;
}

declare global {
  interface Window {
    AMap: any;
  }
}

export default function App() {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [spots, setSpots] = useState<Spot[]>(spotsData);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [filterHeritage, setFilterHeritage] = useState(true); // Default to showing heritage only
  const [searchQuery, setSearchQuery] = useState('');
  const markersRef = useRef<any[]>([]);
  const [isListOpen, setIsListOpen] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || !window.AMap) return;

    // Create map instance
    const map = new window.AMap.Map(mapContainerRef.current, {
      zoom: 17,
      center: [117.192500, 39.144000], // Center on Ancient Culture Street
      viewMode: '2D',
      pitch: 0,
      mapStyle: 'amap://styles/whitesmoke', // Optional: lighter map style if available, or default
    });

    // Restrict map to Ancient Culture Street area
    const bounds = new window.AMap.Bounds(
      [117.190000, 39.141000], // SouthWest
      [117.195000, 39.146000]  // NorthEast
    );
    map.setLimitBounds(bounds);
    map.setZoom(17);

    mapRef.current = map;

    // Handle map click to deselect
    map.on('click', () => {
      setSelectedSpot(null);
    });

    return () => {
      map.destroy();
    };
  }, []);

  // Update Markers when spots or filter changes
  useEffect(() => {
    if (!mapRef.current || !window.AMap) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const filteredSpots = spots.filter(spot => {
      const matchesFilter = filterHeritage ? spot.isHeritage : true;
      const matchesSearch = spot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            spot.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });

    filteredSpots.forEach(spot => {
      const [lng, lat] = spot.location.split(',').map(Number);
      
      const markerContent = document.createElement('div');
      markerContent.className = `custom-marker ${spot.isHeritage ? 'heritage' : 'normal'}`;
      // Traditional colors: Deep Red (Vermilion) for Heritage, Muted Blue (Indigo) for others
      const bgColor = spot.isHeritage ? 'bg-[#8b1a1a]' : 'bg-[#4a6b8a]';
      const borderColor = spot.isHeritage ? 'border-[#d4af37]' : 'border-[#eaddcf]';
      
      markerContent.innerHTML = `
        <div class="w-8 h-8 rounded-full border-2 ${bgColor} ${borderColor} flex items-center justify-center shadow-lg cursor-pointer transform transition-transform active:scale-90 relative">
          <div class="absolute inset-0 rounded-full border border-white/20"></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#fdfbf7]"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="marker-label absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-[#fdfbf7]/90 backdrop-blur-sm px-2 py-1 rounded border border-[#d4c4b7] text-xs font-bold shadow-sm whitespace-nowrap ${spot.isHeritage ? 'text-[#8b1a1a]' : 'text-[#5c4033]'} font-serif z-50 pointer-events-none">
          ${spot.name}
        </div>
      `;

      const marker = new window.AMap.Marker({
        position: [lng, lat],
        content: markerContent,
        offset: new window.AMap.Pixel(-16, -32),
        title: spot.name,
        zIndex: spot.isHeritage ? 100 : 50, // Heritage spots on top
        extData: { id: spot.id }
      });

      marker.on('click', () => {
        handleSpotClick(spot);
      });

      marker.setMap(mapRef.current);
      markersRef.current.push(marker);
    });

  }, [spots, filterHeritage, searchQuery]);

  // Effect to center map when selectedSpot changes via list
  useEffect(() => {
    if (selectedSpot && mapRef.current) {
      const [lng, lat] = selectedSpot.location.split(',').map(Number);
      mapRef.current.setZoomAndCenter(18, [lng, lat]);
    }
  }, [selectedSpot]);

  const handleSpotClick = (spot: Spot) => {
    setSelectedSpot(spot);
    setIsListOpen(false); // Close list if open
  };

  const filteredSpotsList = spots.filter(spot => {
    const matchesFilter = filterHeritage ? spot.isHeritage : true;
    const matchesSearch = spot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          spot.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col h-screen w-full bg-[#fdfbf7] font-serif overflow-hidden relative">
      
      {/* Top Floating Bar (Search & Filter) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex gap-2">
        <div className="flex-1 bg-[#fdfbf7]/95 backdrop-blur-md shadow-lg rounded-full border border-[#d4c4b7] flex items-center px-4 py-2">
          <Search className="text-[#8b5a2b] w-5 h-5 mr-2" />
          <input 
            type="text" 
            placeholder="寻访津门故里..." 
            className="w-full bg-transparent border-none focus:outline-none text-[#5c4033] placeholder-[#a89f91] text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#a89f91]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <button 
          onClick={() => setFilterHeritage(!filterHeritage)}
          className={`w-12 h-12 rounded-full shadow-lg border flex items-center justify-center transition-colors ${
            filterHeritage 
              ? 'bg-[#8b1a1a] border-[#d4af37] text-[#fdfbf7]' 
              : 'bg-[#fdfbf7] border-[#d4c4b7] text-[#5c4033]'
          }`}
        >
          <span className="text-xs font-bold writing-vertical-rl">{filterHeritage ? '非遗' : '全部'}</span>
        </button>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Bottom Sheet / Card Area */}
      <AnimatePresence>
        {selectedSpot ? (
          /* Selected Spot Detail Card */
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-[#fdfbf7] rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-[#d4c4b7] p-6 pb-8"
          >
            <div className="w-12 h-1 bg-[#d4c4b7] rounded-full mx-auto mb-4 opacity-50" />
            
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-2xl font-bold text-[#8b1a1a]">{selectedSpot.name}</h2>
              <button 
                onClick={() => setSelectedSpot(null)}
                className="p-1 bg-[#fdfbf7] rounded-full border border-[#d4c4b7] text-[#8b5a2b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {selectedSpot.isHeritage && (
                <span className="text-xs bg-[#8b1a1a] text-[#fdfbf7] px-2 py-0.5 rounded-full border border-[#d4af37]">
                  非物质文化遗产
                </span>
              )}
              <span className="text-xs text-[#5c4033] bg-[#eaddcf]/30 px-2 py-0.5 rounded-full border border-[#eaddcf]">
                {selectedSpot.type.split(';')[0]}
              </span>
            </div>

            <p className="text-sm text-[#5c4033] mb-4 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#8b5a2b] mt-0.5 flex-shrink-0" />
              {selectedSpot.address}
            </p>

            <div className="bg-[#fffdf5] p-4 rounded-xl border border-[#eaddcf] text-sm text-[#5c4033] leading-relaxed italic relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-[#8b1a1a]/20"></div>
               {selectedSpot.description || '暂无详细介绍...'}
            </div>

            <button className="w-full mt-4 bg-[#8b1a1a] text-[#fdfbf7] py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Navigation className="w-4 h-4" />
              导航前往
            </button>
          </motion.div>
        ) : (
          /* List View Bottom Sheet (Collapsed/Expanded) */
          <motion.div 
            initial={{ height: "120px" }}
            animate={{ height: isListOpen ? "70vh" : "120px" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-[#fdfbf7] rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-[#d4c4b7] flex flex-col"
          >
            {/* Drag Handle Area */}
            <div 
              className="w-full p-3 flex justify-center cursor-pointer"
              onClick={() => setIsListOpen(!isListOpen)}
            >
              <div className="w-12 h-1 bg-[#d4c4b7] rounded-full opacity-50" />
            </div>

            {/* Header */}
            <div className="px-6 pb-2 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-bold text-[#5c4033]">
                附近地点 <span className="text-sm font-normal text-[#8b5a2b]">({filteredSpotsList.length})</span>
              </h3>
              <button 
                onClick={() => setIsListOpen(!isListOpen)}
                className="text-[#8b5a2b] text-sm flex items-center gap-1"
              >
                {isListOpen ? '收起' : '展开'}
                {isListOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
              <div className="space-y-3 mt-2">
                {filteredSpotsList.map(spot => (
                  <div 
                    key={spot.id}
                    onClick={() => handleSpotClick(spot)}
                    className="p-4 bg-white rounded-xl border border-[#eaddcf] shadow-sm flex justify-between items-center active:bg-[#fffdf5]"
                  >
                    <div>
                      <h4 className={`font-bold ${spot.isHeritage ? 'text-[#8b1a1a]' : 'text-[#5c4033]'}`}>{spot.name}</h4>
                      <p className="text-xs text-[#8b5a2b] mt-1 truncate max-w-[200px]">{spot.address}</p>
                    </div>
                    {spot.isHeritage && (
                      <span className="text-[10px] bg-[#8b1a1a]/10 text-[#8b1a1a] px-2 py-1 rounded-full border border-[#8b1a1a]/20">
                        非遗
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
