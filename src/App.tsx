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
  const [filterMode, setFilterMode] = useState<'all' | 'food' | 'culture'>('all'); // 'all', 'food' (heritage food), 'culture' (heritage non-food)
  const [searchQuery, setSearchQuery] = useState('');
  const markersRef = useRef<any[]>([]);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);

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
      let matchesFilter = true;
      if (filterMode === 'food') {
        matchesFilter = spot.isHeritage && spot.type === '餐饮';
      } else if (filterMode === 'culture') {
        matchesFilter = spot.isHeritage && spot.type !== '餐饮';
      }
      // 'all' shows everything (or maybe just all heritage? User said "switch these two and all", implying 3 states)
      // Let's assume 'all' means ALL spots including non-heritage for now, or maybe all heritage?
      // Given the previous state was "Heritage Only" vs "All", let's keep "All" as truly ALL.
      
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
        handleSpotClick(spot, false);
      });

      marker.setMap(mapRef.current);
      markersRef.current.push(marker);
    });

  }, [spots, filterMode, searchQuery]);

  // Effect to center map when selectedSpot changes via list
  useEffect(() => {
    if (selectedSpot && mapRef.current) {
      const [lng, lat] = selectedSpot.location.split(',').map(Number);
      mapRef.current.setZoomAndCenter(18, [lng, lat]);
    }
  }, [selectedSpot]);

  const handleSpotClick = (spot: Spot, fromList: boolean = false) => {
    setSelectedSpot(spot);
    setIsListOpen(false); // Close list if open
    setIsDetailExpanded(fromList); // Expand detail if clicked from list, otherwise collapsed
  };

  const filteredSpotsList = spots.filter(spot => {
    let matchesFilter = true;
    if (filterMode === 'food') {
      matchesFilter = spot.isHeritage && spot.type === '餐饮';
    } else if (filterMode === 'culture') {
      matchesFilter = spot.isHeritage && spot.type !== '餐饮';
    }
    
    const matchesSearch = spot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          spot.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toggleFilterMode = () => {
    if (filterMode === 'all') setFilterMode('food');
    else if (filterMode === 'food') setFilterMode('culture');
    else setFilterMode('all');
  };

  const getFilterLabel = () => {
    if (filterMode === 'all') return '全部';
    if (filterMode === 'food') return '美食';
    return '文创';
  };

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
          onClick={toggleFilterMode}
          className={`w-12 h-12 rounded-full shadow-lg border flex items-center justify-center transition-colors ${
            filterMode !== 'all'
              ? 'bg-[#8b1a1a] border-[#d4af37] text-[#fdfbf7]' 
              : 'bg-[#fdfbf7] border-[#d4c4b7] text-[#5c4033]'
          }`}
        >
          <span className="text-xs font-bold writing-vertical-rl">{getFilterLabel()}</span>
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
            animate={{ y: 0, height: isDetailExpanded ? "75vh" : "auto" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (isDetailExpanded && info.offset.y > 50) {
                setIsDetailExpanded(false);
              } else if (!isDetailExpanded && info.offset.y < -50) {
                setIsDetailExpanded(true);
              } else if (!isDetailExpanded && info.offset.y > 50) {
                setSelectedSpot(null);
              }
            }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-[#fdfbf7] rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-[#d4c4b7] flex flex-col"
          >
            {/* Drag Handle Area */}
            <div 
              className="w-full p-4 flex justify-center cursor-pointer flex-shrink-0"
              onClick={() => setIsDetailExpanded(!isDetailExpanded)}
            >
              <div className="w-12 h-1.5 bg-[#d4c4b7] rounded-full opacity-50" />
            </div>
            
            <div className="px-6 pb-8 overflow-y-auto custom-scrollbar flex-1">
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

              <div className="bg-[#fffdf5] p-4 rounded-xl border border-[#eaddcf] text-sm text-[#5c4033] leading-relaxed relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-[#8b1a1a]/20"></div>
                 <div className={`whitespace-pre-wrap ${!isDetailExpanded ? 'line-clamp-3' : ''}`}>
                   {selectedSpot.description ? (
                     (() => {
                       const baiduMatch = selectedSpot.description.match(/百度百科: (https?:\/\/[^\s]+)/);
                       const biliMatch = selectedSpot.description.match(/Bilibili: (https?:\/\/[^\s]+)/);
                       
                       let displayText = selectedSpot.description
                          .replace(/百度百科: https?:\/\/[^\s]+/g, '')
                          .replace(/Bilibili: https?:\/\/[^\s]+/g, '')
                          .trim();

                       return (
                         <>
                           {displayText}
                           
                           {isDetailExpanded && (
                             <div className="mt-4 flex flex-wrap gap-2">
                               {baiduMatch && baiduMatch[1] && (
                                 <a 
                                   href={baiduMatch[1]} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#f0f0f0] text-[#333] rounded-full text-xs font-bold hover:bg-[#e0e0e0] transition-colors border border-[#ccc]"
                                 >
                                   <span className="w-4 h-4 flex items-center justify-center bg-[#2932e1] text-white rounded text-[10px]">百</span>
                                   百度百科
                                 </a>
                               )}
                               
                               {biliMatch && biliMatch[1] && (
                                 <a 
                                   href={biliMatch[1]} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#f6f6f6] text-[#fb7299] rounded-full text-xs font-bold hover:bg-[#f0f0f0] transition-colors border border-[#fb7299]/30"
                                 >
                                   <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a.9.9 0 0 1-.272-.645c0-.247.09-.46.27-.639a.878.878 0 0 1 .64-.266c.246 0 .46.09.64.266l1.96 1.871h7.627l1.96-1.871c.18-.178.393-.266.64-.266.246 0 .46.09.64.266a.878.878 0 0 1 .27.64c0 .248-.09.463-.27.645l-1.174 1.12Zm-2.653 10.662c0-.578-.208-1.07-.626-1.479a2.006 2.006 0 0 0-1.48-.614 2.006 2.006 0 0 0-1.48.614 2.033 2.033 0 0 0-.626 1.48c0 .578.208 1.07.626 1.479a2.006 2.006 0 0 0 1.48.614c.578 0 1.07-.205 1.48-.614a2.033 2.033 0 0 0 .626-1.48Zm-6.4 0c0-.578-.208-1.07-.626-1.479a2.006 2.006 0 0 0-1.48-.614 2.006 2.006 0 0 0-1.48.614 2.033 2.033 0 0 0-.626 1.48c0 .578.208 1.07.626 1.479a2.006 2.006 0 0 0 1.48.614c.578 0 1.07-.205 1.48-.614a2.033 2.033 0 0 0 .626-1.48Z"/></svg>
                                   相关视频
                                 </a>
                               )}
                             </div>
                           )}
                         </>
                       );
                     })()
                   ) : '暂无详细介绍...'}
                 </div>
              </div>

              <button 
                onClick={() => {
                  const [lng, lat] = selectedSpot.location.split(',');
                  window.open(`https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(selectedSpot.name)}`, '_blank');
                }}
                className="w-full mt-4 bg-[#8b1a1a] text-[#fdfbf7] py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Navigation className="w-4 h-4" />
                导航前往
              </button>
            </div>
          </motion.div>
        ) : (
          /* List View Bottom Sheet (Collapsed/Expanded) */
          <motion.div 
            initial={{ height: "160px" }}
            animate={{ height: isListOpen ? "70vh" : "160px" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (isListOpen && info.offset.y > 50) {
                setIsListOpen(false);
              } else if (!isListOpen && info.offset.y < -50) {
                setIsListOpen(true);
              }
            }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-[#fdfbf7] rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-[#d4c4b7] flex flex-col"
          >
            {/* Drag Handle Area */}
            <div 
              className="w-full p-4 flex justify-center cursor-pointer flex-shrink-0"
              onClick={() => setIsListOpen(!isListOpen)}
            >
              <div className="w-12 h-1.5 bg-[#d4c4b7] rounded-full opacity-50" />
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
            <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar" onPointerDown={(e) => e.stopPropagation()}>
              <div className="space-y-3 mt-2">
                {filteredSpotsList.map(spot => (
                  <div 
                    key={spot.id}
                    onClick={() => handleSpotClick(spot, true)}
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
