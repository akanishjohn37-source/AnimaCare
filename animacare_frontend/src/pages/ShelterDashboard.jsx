import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Activity, MapPin, PawPrint, Users, AlertCircle, CheckCircle, 
  Navigation, Shield, Search, Filter, Calendar, Tag, Info,
  Mail, Clock, ChevronRight, User, ExternalLink, X, Heart, DollarSign,
  LayoutGrid, Home, Thermometer, Droplets, Plus, Minus, Settings, Trash2, Edit3, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// Fix leaflet marker icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow,
});

export default function ShelterDashboard() {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('rescue');
  const [nearbyAlerts, setNearbyAlerts] = useState([]);
  const [selectedMapAlert, setSelectedMapAlert] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  
  const [selectedPet, setSelectedPet] = useState(null);
  const [isUpdatingPet, setIsUpdatingPet] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  
  const [totalCapacity, setTotalCapacity] = useState(50);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [kanban, setKanban] = useState({
    columnOrder: ['Pending', 'Under Review', 'Interview Scheduled', 'Approved'],
    columns: {
      'Pending': { id: 'Pending', title: 'Pending', taskIds: [] },
      'Under Review': { id: 'Under Review', title: 'Under Review', taskIds: [] },
      'Interview Scheduled': { id: 'Interview Scheduled', title: 'Interview Scheduled', taskIds: [] },
      'Approved': { id: 'Approved', title: 'Approved', taskIds: [] }
    },
    tasks: {}
  });

  const fetchNearbyAlerts = async () => {
    try {
      const res = await authFetch('http://localhost:8000/api/citizens/sos/nearby/');
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const parsedData = data.map(alert => {
            let parsedLat = 40.7128; let parsedLng = -74.0060;
            let displayLoc = alert.location || "Unknown Location";
            if (alert.location && alert.location.includes(',')) {
              const parts = alert.location.split(',');
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                parsedLat = parseFloat(parts[0]); parsedLng = parseFloat(parts[1]);
                displayLoc = `Lat: ${parsedLat.toFixed(4)}, Lng: ${parsedLng.toFixed(4)}`;
              }
            }
            return { ...alert, lat: parsedLat, lng: parsedLng, location: displayLoc };
          });
          setNearbyAlerts(parsedData);
        } else {
          setNearbyAlerts([{ id: 'mock-1', animal_description: "Stray dog near highway", location: "Route 66", timestamp: new Date().toISOString(), lat: 40.7128, lng: -74.0060 }]);
        }
      }
    } catch (err) { console.error(err); }
  };

  const fetchInventory = async () => {
    setIsLoadingInventory(true);
    try {
      const res = await authFetch('http://localhost:8000/api/shelter/inventory/');
      if (res.ok) setInventory(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsLoadingInventory(false); }
  };

  const fetchApps = async () => {
    try {
      const res = await authFetch('http://localhost:8000/api/shelter/applications/');
      if (res.ok) {
        const data = await res.json();
        const tasks = {};
        const columns = { 'Pending': { id: 'Pending', title: 'Pending', taskIds: [] }, 'Under Review': { id: 'Under Review', title: 'Under Review', taskIds: [] }, 'Interview Scheduled': { id: 'Interview Scheduled', title: 'Interview Scheduled', taskIds: [] }, 'Approved': { id: 'Approved', title: 'Approved', taskIds: [] } };
        data.forEach(app => {
          const taskId = `app-${app.id}`;
          tasks[taskId] = { ...app, id: taskId, dbId: app.id };
          if (columns[app.status]) columns[app.status].taskIds.push(taskId);
          else columns['Pending'].taskIds.push(taskId);
        });
        setKanban({ columnOrder: ['Pending', 'Under Review', 'Interview Scheduled', 'Approved'], columns, tasks });
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchNearbyAlerts(); fetchApps(); }, [authFetch]);
  useEffect(() => { if (activeTab === 'inventory') fetchInventory(); }, [activeTab]);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
    const startColumn = kanban.columns[source.droppableId];
    const finishColumn = kanban.columns[destination.droppableId];
    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1); newTaskIds.splice(destination.index, 0, draggableId);
      setKanban({ ...kanban, columns: { ...kanban.columns, [startColumn.id]: { ...startColumn, taskIds: newTaskIds } } });
      return;
    }
    const startTaskIds = Array.from(startColumn.taskIds); startTaskIds.splice(source.index, 1);
    const finishTaskIds = Array.from(finishColumn.taskIds); finishTaskIds.splice(destination.index, 0, draggableId);
    setKanban({ ...kanban, columns: { ...kanban.columns, [startColumn.id]: { ...startColumn, taskIds: startTaskIds }, [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds } } });
    const task = kanban.tasks[draggableId];
    authFetch(`http://localhost:8000/api/shelter/applications/${task.dbId}/update_status/`, { method: 'PATCH', body: JSON.stringify({ status: destination.droppableId }) });
  };

  const handleUpdatePet = async (fields) => {
    setIsUpdatingPet(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/shelter/inventory/${selectedPet.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(fields)
      });
      if (res.ok) {
        const updated = await res.json();
        setInventory(inventory.map(p => p.id === selectedPet.id ? updated : p));
        setSelectedPet(updated);
        setIsEditing(false);
      }
    } catch (err) { console.error(err); }
    finally { setIsUpdatingPet(false); }
  };

  const handleRemovePet = async () => {
    if (!window.confirm(`Permanently remove ${selectedPet.name}?`)) return;
    setIsUpdatingPet(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/shelter/inventory/${selectedPet.id}/`, { method: 'DELETE' });
      if (res.ok) {
        setInventory(inventory.filter(p => p.id !== selectedPet.id));
        setSelectedPet(null);
      }
    } catch (err) { console.error(err); }
    finally { setIsUpdatingPet(false); }
  };

  const generateCapacitySlots = () => {
    const slots = [];
    const midPoint = Math.floor(totalCapacity / 2);
    for (let i = 1; i <= totalCapacity; i++) {
      const isOccupied = inventory.length >= i;
      slots.push({ id: i, status: isOccupied ? 'Occupied' : 'Available', pet: isOccupied ? inventory[i-1] : null, zone: i <= midPoint ? 'Zone Alpha' : 'Zone Beta' });
    }
    return slots;
  };

  const capacitySlots = generateCapacitySlots();

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col pt-16">
      <header className="bg-neutral-800 p-6 border-b border-neutral-700 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400 flex items-center gap-3"><PawPrint size={32} /> Shelter Command Center</h1>
          <p className="text-neutral-400 mt-1">Operational control for rescues and adoptions.</p>
        </div>
      </header>

      <div className="flex-1 flex px-8 py-6 gap-8 overflow-hidden">
        <aside className="w-64 flex flex-col gap-3">
          {[
            { id: 'rescue', icon: AlertCircle, label: 'Rescue Missions', count: nearbyAlerts.length, color: 'text-red-400' },
            { id: 'kanban', icon: Activity, label: 'Adoption Pipeline', color: 'text-emerald-400' },
            { id: 'inventory', icon: PawPrint, label: 'Animal Inventory', color: 'text-emerald-400' },
            { id: 'capacity', icon: LayoutGrid, label: 'Capacity Tracker', color: 'text-emerald-400' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`p-4 rounded-xl flex items-center justify-between transition-all group ${activeTab === tab.id ? 'bg-emerald-600 shadow-lg shadow-emerald-900/20' : 'bg-neutral-800/50 hover:bg-neutral-800 border border-transparent hover:border-neutral-700'}`}>
              <div className="flex items-center gap-3"><tab.icon size={20} className={activeTab === tab.id ? 'text-white' : tab.color} /><span className={`text-sm font-medium ${activeTab === tab.id ? 'text-white' : 'text-neutral-400'}`}>{tab.label}</span></div>
            </button>
          ))}
        </aside>

        <main className="flex-1 bg-neutral-800/30 rounded-2xl p-6 border border-neutral-700/50 backdrop-blur-sm shadow-xl flex flex-col relative overflow-hidden">
          {activeTab === 'rescue' && (
            <div className="h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><AlertCircle className="text-red-400"/> Critical SOS Alerts</h2>
              <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2">
                 {nearbyAlerts.map(alert => (
                    <div key={alert.id} className="bg-neutral-900 border-l-4 border-red-500 p-6 rounded-xl flex justify-between items-center"><div className="flex-1"><p className="text-lg font-bold text-white mb-2">{alert.animal_description}</p><div className="flex items-center gap-2 text-neutral-400 text-sm"><MapPin size={14} className="text-red-400" /><span>{alert.location}</span></div></div><button onClick={() => setSelectedMapAlert(alert)} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"><Navigation size={18} /> Respond</button></div>
                 ))}
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Activity className="text-emerald-400" /> Adoption Pipeline</h2>
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-6 overflow-x-auto pb-6 flex-1 custom-scrollbar">
                  {kanban.columnOrder.map(columnId => {
                    const column = kanban.columns[columnId]; const tasks = column.taskIds.map(taskId => kanban.tasks[taskId]);
                    return (
                      <div key={column.id} className="bg-neutral-900/50 rounded-2xl p-4 w-80 flex-shrink-0 border border-neutral-700 flex flex-col"><div className="flex justify-between items-center mb-4 px-1"><h3 className="font-bold text-sm text-neutral-400 uppercase tracking-widest">{column.title}</h3><span className="bg-neutral-800 text-neutral-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{tasks.length}</span></div><Droppable droppableId={column.id}>{(provided) => (<div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 min-h-[200px] flex flex-col gap-4">{tasks.map((task, index) => (<Draggable key={task.id} draggableId={task.id} index={index}>{(provided) => (<div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="bg-neutral-800 p-5 rounded-xl border border-neutral-700 shadow-lg hover:border-emerald-500/50 transition-all group"><div className="flex justify-between items-start mb-3"><div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400"><User size={20} /></div><button onClick={() => setSelectedApplication(task)} className="p-1.5 rounded-lg bg-neutral-900 text-neutral-500 hover:text-emerald-400 hover:bg-neutral-700 transition-all"><ExternalLink size={14} /></button></div><h4 className="font-bold text-white text-base">{task.applicant_name}</h4><div className="flex items-center gap-2 text-neutral-500 text-xs mt-1 mb-4"><Mail size={12} /> {task.applicant_email}</div></div>)}</Draggable>))}{provided.placeholder}</div>)}</Droppable></div>
                    );
                  })}
                </div>
              </DragDropContext>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-2"><PawPrint className="text-emerald-400"/> Animal Tracking Inventory</h2>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                 <div className="grid grid-cols-1 gap-4 pb-6">
                    {inventory.map(pet => (
                       <div key={pet.id} className="bg-neutral-900/80 border border-neutral-700/50 rounded-2xl p-5 flex items-center gap-8 hover:bg-neutral-900 transition-all"><div className="w-24 h-24 rounded-2xl overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700"><img src={pet.media_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&h=200&fit=crop'} alt={pet.name} className="w-full h-full object-cover" /></div><div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6"><div className="min-w-[180px]"><h4 className="text-white font-black text-xl leading-tight">{pet.name}</h4><p className="text-neutral-500 text-sm font-medium mt-1">{pet.species} • {pet.breed || 'Unknown'}</p></div><div className="grid grid-cols-2 lg:grid-cols-3 gap-8 flex-1"><div><p className="text-[10px] text-neutral-600 uppercase font-black mb-1">Health Status</p><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${pet.medical_triage_status === 'Healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} /><span className="text-sm font-bold text-neutral-300">{pet.medical_triage_status}</span></div></div><div><p className="text-[10px] text-neutral-600 uppercase font-black mb-1">Intake Date</p><p className="text-sm font-bold text-neutral-300">{new Date(pet.intake_date).toLocaleDateString()}</p></div><div className="hidden lg:block"><p className="text-[10px] text-neutral-600 uppercase font-black mb-1">Market Status</p><div className={`flex items-center gap-1.5 font-black text-sm ${pet.is_available ? 'text-emerald-400' : 'text-neutral-500'}`}><Tag size={14} /> {pet.is_available ? `Listed` : 'Rescued'}</div></div></div></div><div className="flex gap-3"><button onClick={() => { setSelectedPet(pet); setIsEditing(false); }} className="p-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-all border border-neutral-700"><Info size={18} /></button></div></div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'capacity' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
              <div className="flex justify-between items-end mb-8">
                <div><h2 className="text-3xl font-black text-white flex items-center gap-3"><Home className="text-emerald-400" size={32}/> Facility Control Center</h2><p className="text-neutral-500 font-bold mt-1 uppercase tracking-widest text-xs">Dynamic Capacity & Grid Management</p></div>
                <div className="flex items-center gap-6"><div className="text-right"><p className="text-[10px] text-neutral-600 uppercase font-black mb-1">Overall Occupancy</p><h3 className="text-4xl font-black text-emerald-400">{inventory.length} <span className="text-neutral-600">/ {totalCapacity}</span></h3></div><button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-3 bg-neutral-900 border border-neutral-700 rounded-xl hover:bg-neutral-800 transition-all text-neutral-400 hover:text-white"><Settings size={24} /></button></div>
              </div>
              <AnimatePresence>{isSettingsOpen && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-8"><div className="bg-neutral-900 p-6 rounded-2xl border border-emerald-500/20 flex justify-between items-center"><div><h4 className="font-black text-white uppercase tracking-widest text-sm">Scale Facility Capacity</h4><p className="text-neutral-500 text-xs mt-1">Adjust total units for the entire shelter.</p></div><div className="flex items-center gap-4"><button onClick={() => setTotalCapacity(Math.max(1, totalCapacity - 5))} className="p-3 bg-neutral-800 hover:bg-red-600/20 text-red-400 rounded-xl transition-all border border-neutral-700"><Minus size={20} /></button><div className="w-20 text-center font-black text-2xl text-white">{totalCapacity}</div><button onClick={() => setTotalCapacity(totalCapacity + 5)} className="p-3 bg-neutral-800 hover:bg-emerald-600/20 text-emerald-400 rounded-xl transition-all border border-neutral-700"><Plus size={20} /></button></div></div></motion.div>)}</AnimatePresence>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar"><div className="grid grid-cols-5 md:grid-cols-10 gap-3 pb-4">{capacitySlots.map(slot => (<div key={slot.id} onClick={() => setSelectedSlot(slot)} className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all relative group cursor-pointer ${slot.status === 'Occupied' ? 'bg-emerald-600/10 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-neutral-900 border-neutral-800 hover:border-emerald-500/30'}`}><span className="text-[10px] font-black text-neutral-600 mb-1">{slot.id}</span>{slot.status === 'Occupied' ? <PawPrint size={20} className="text-emerald-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />}</div>))}</div></div>
            </motion.div>
          )}
        </main>
      </div>

      {/* Mini Slot Detail Modal */}
      <AnimatePresence>
         {selectedSlot && (
            <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedSlot(null)}>
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                  <div className="bg-neutral-800 p-4 flex justify-between items-center border-b border-neutral-700">
                     <h3 className="font-black text-white uppercase tracking-widest text-xs flex items-center gap-2"><Home size={14} className="text-emerald-400"/> Unit {selectedSlot.id} Summary</h3>
                     <button onClick={() => setSelectedSlot(null)} className="text-neutral-500 hover:text-white"><X size={18}/></button>
                  </div>
                  <div className="p-6">
                     <div className="flex items-center gap-4 mb-6">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${selectedSlot.status === 'Occupied' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-600 border border-neutral-700'}`}>
                           {selectedSlot.status === 'Occupied' ? <PawPrint size={32} /> : <Home size={32} />}
                        </div>
                        <div>
                           <p className="text-[10px] text-neutral-600 uppercase font-black">Current Status</p>
                           <p className={`text-lg font-black ${selectedSlot.status === 'Occupied' ? 'text-emerald-400' : 'text-neutral-400'}`}>{selectedSlot.status.toUpperCase()}</p>
                           <p className="text-xs text-neutral-500 font-bold">{selectedSlot.zone}</p>
                        </div>
                     </div>
                     {selectedSlot.pet ? (
                        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
                           <p className="text-[10px] text-neutral-600 uppercase font-black mb-2">Occupant Details</p>
                           <div className="flex justify-between items-center">
                              <div>
                                 <p className="text-white font-black text-base">{selectedSlot.pet.name}</p>
                                 <p className="text-xs text-neutral-500">{selectedSlot.pet.species} • {selectedSlot.pet.breed || 'Mixed'}</p>
                              </div>
                              <button onClick={() => { setSelectedPet(selectedSlot.pet); setSelectedSlot(null); }} className="p-2 bg-neutral-900 hover:bg-neutral-700 rounded-lg text-emerald-400 transition-all border border-neutral-700">
                                 <ExternalLink size={16} />
                              </button>
                           </div>
                        </div>
                     ) : (
                        <div className="bg-neutral-800/20 rounded-xl p-4 border border-neutral-700 border-dashed text-center">
                           <p className="text-xs text-neutral-600 font-bold italic">This unit is currently sterilized and ready for intake.</p>
                        </div>
                     )}
                  </div>
                  <div className="p-4 bg-neutral-800/30 border-t border-neutral-700 flex justify-center">
                     <button onClick={() => setSelectedSlot(null)} className="text-[10px] text-neutral-500 uppercase font-black hover:text-white transition-colors">Close Summary</button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Pet Detail & Management Modal */}
      <AnimatePresence>
        {selectedPet && (
          <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-neutral-900 rounded-3xl w-full max-w-4xl overflow-hidden border border-neutral-700 shadow-2xl flex flex-col md:flex-row">
               <div className="md:w-1/2 h-64 md:h-auto relative"><img src={selectedPet.media_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=800&fit=crop'} alt={selectedPet.name} className="w-full h-full object-cover" /><div className="absolute top-4 left-4"><span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${selectedPet.is_available ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>{selectedPet.is_available ? 'Live on Market' : 'Internal Inventory'}</span></div></div>
               <div className="md:w-1/2 p-8 flex flex-col overflow-y-auto max-h-[90vh]"><div className="flex justify-between items-start mb-6">{isEditing ? (<div className="flex-1 mr-4"><input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-2xl font-black text-white outline-none focus:border-emerald-500 mb-2" placeholder="Animal Name" /><div className="flex gap-2"><input type="text" value={editData.species} onChange={e => setEditData({...editData, species: e.target.value})} className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm text-neutral-400 outline-none" placeholder="Species" /><input type="text" value={editData.breed} onChange={e => setEditData({...editData, breed: e.target.value})} className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm text-neutral-400 outline-none" placeholder="Breed" /></div></div>) : (<div><h2 className="text-4xl font-black text-white">{selectedPet.name}</h2><p className="text-neutral-500 font-bold mt-1 text-lg">{selectedPet.species} • {selectedPet.breed || 'Unknown'}</p></div>)}<button onClick={() => setSelectedPet(null)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors"><X size={24} className="text-neutral-500" /></button></div><div className="grid grid-cols-2 gap-6 mb-8"><div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700"><p className="text-[10px] text-neutral-600 uppercase font-black mb-1 text-emerald-500">Health Status</p>{isEditing ? (<select value={editData.medical_triage_status} onChange={e => setEditData({...editData, medical_triage_status: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-sm font-bold text-emerald-400 outline-none"><option value="Healthy">Healthy</option><option value="Injured">Injured</option><option value="Sick">Sick</option><option value="Critical">Critical</option><option value="Recovering">Recovering</option></select>) : (<div className="flex items-center gap-2 text-emerald-400 font-bold"><Heart size={16}/> {selectedPet.medical_triage_status}</div>)}</div><div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700"><p className="text-[10px] text-neutral-600 uppercase font-black mb-1">Market Price</p>{isEditing ? (<div className="flex items-center gap-2"><span className="text-neutral-500">$</span><input type="number" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-sm font-bold text-white outline-none" /></div>) : (<div className="flex items-center gap-2 text-white font-bold"><DollarSign size={16}/> ${selectedPet.price} ({selectedPet.listing_type})</div>)}</div></div><div className="mt-auto space-y-4"><div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPet.is_available ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-400'}`}><Activity size={24} /></div><div className="flex-1"><p className="text-xs font-bold text-white">{selectedPet.is_available ? 'Live on Market' : 'Internal Inventory'}</p><p className="text-[10px] text-neutral-500">Currently {selectedPet.is_available ? 'Visible' : 'Hidden'} from public eyes.</p></div><button onClick={() => handleUpdatePet({ is_available: !selectedPet.is_available })} disabled={isUpdatingPet} className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${selectedPet.is_available ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>{isUpdatingPet ? 'SYNCING...' : selectedPet.is_available ? 'UNPUBLISH' : 'PUBLISH LIVE'}</button></div><div className="flex gap-4">{isEditing ? (<button onClick={() => handleUpdatePet(editData)} disabled={isUpdatingPet} className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-2"><Save size={18} /> Save Changes</button>) : (<button onClick={() => { setEditData({...selectedPet}); setIsEditing(true); }} className="flex-1 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold border border-neutral-700 transition-all flex items-center justify-center gap-2"><Edit3 size={18} /> Edit Details</button>)}<button onClick={handleRemovePet} disabled={isUpdatingPet} className="flex-1 py-3.5 rounded-2xl bg-red-600/10 hover:bg-red-600/20 text-red-400 font-bold border border-red-500/30 transition-all flex items-center justify-center gap-2"><Trash2 size={18} /> Remove Pet</button></div>{isEditing && <button onClick={() => setIsEditing(false)} className="w-full py-2 text-neutral-500 text-xs hover:text-white transition-colors">Cancel Editing</button>}</div></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
