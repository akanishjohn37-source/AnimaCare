import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import invertedKeralaData from '../assets/inverted_kerala.json';
import keralaData from '../assets/kerala_feature.json';

const KERALA_BOUNDS = [
  [8.15, 74.85],
  [12.85, 77.40]
];
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Activity, MapPin, PawPrint, Users, AlertCircle, CheckCircle, 
  Navigation, Shield, Search, Filter, Calendar, Tag, Info,
  Mail, Clock, ChevronRight, User, ExternalLink, X, Heart, DollarSign,
  LayoutGrid, Home, Thermometer, Droplets, Plus, Minus, Settings, Trash2, Edit3, Save,
  BellRing, Zap, UserCircle, Map as MapIcon, Handshake, CheckSquare, Loader2, Camera, Upload, Download
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
  const { user, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('rescue');
  const [nearbyAlerts, setNearbyAlerts] = useState([]);
  const [selectedMapAlert, setSelectedMapAlert] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [pdfApplication, setPdfApplication] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [interviewDate, setInterviewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [interviewLocation, setInterviewLocation] = useState('Shelter Facility');
  const [selectedPet, setSelectedPet] = useState(null);
  const [isUpdatingPet, setIsUpdatingPet] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  
  const [totalCapacity, setTotalCapacity] = useState(() => {
    const saved = localStorage.getItem('shelter_capacity');
    return saved ? parseInt(saved, 10) : 50;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    localStorage.setItem('shelter_capacity', totalCapacity);
  }, [totalCapacity]);

  // Rescue Mission State
  const [isProcessingRescue, setIsProcessingRescue] = useState(false);
  const [missionToIntake, setMissionToIntake] = useState(null); 
  const [intakeForm, setIntakeForm] = useState({
    name: '', species: 'Dog', breed: '', age_y: '', age_m: '', age_d: '', medical_triage_status: 'Injured', media_url: '',
    price: '0', is_available: false, listing_type: 'Adopt', kennel_zone_id: 'Zone Alpha-1'
  });

  // Real-time Notification State
  const [newAlertNotification, setNewAlertNotification] = useState(null);
  const prevAlertCountRef = useRef(0);

  const [kanban, setKanban] = useState({
    columnOrder: ['Pending', 'Under Review', 'Interview Scheduled', 'Approved', 'Rejected', 'Cancelled'],
    columns: {
      'Pending': { id: 'Pending', title: 'Pending', taskIds: [] },
      'Under Review': { id: 'Under Review', title: 'Under Review', taskIds: [] },
      'Interview Scheduled': { id: 'Interview Scheduled', title: 'Interview Scheduled', taskIds: [] },
      'Approved': { id: 'Approved', title: 'Approved', taskIds: [] },
      'Rejected': { id: 'Rejected', title: 'Rejected', taskIds: [] },
      'Cancelled': { id: 'Cancelled', title: 'Cancelled', taskIds: [] }
    },
    tasks: {}
  });


  const fetchNearbyAlerts = async () => {
    try {
      const res = await authFetch('http://localhost:8000/api/citizens/sos/nearby/');
      if (res.ok) {
        const data = await res.json();
        
        // Check for NEW alerts to trigger notification
        if (data.length > prevAlertCountRef.current && prevAlertCountRef.current > 0) {
           const latest = data[0]; 
           setNewAlertNotification(latest);
           setTimeout(() => setNewAlertNotification(null), 8000); 
        }
        prevAlertCountRef.current = data.length;

        if (data.length > 0) {
          const parsedData = data.map(alert => {
            let parsedLat = 10.8505; let parsedLng = 76.2711;
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
          setNearbyAlerts([]);
        }
      }
    } catch (err) { console.error(err); }
  };

  const fetchInventory = async () => {
    setIsLoadingInventory(true);
    try {
      const res = await authFetch('http://localhost:8000/api/shelter/inventory/');
      if (res.ok) {
        const data = await res.json();
        setInventory(data.results ? data.results : (Array.isArray(data) ? data : []));
      }
    } catch (err) { console.error(err); }
    finally { setIsLoadingInventory(false); }
  };

  const fetchApps = async () => {
    try {
      const res = await authFetch('http://localhost:8000/api/shelter/applications/');
      if (res.ok) {
        const rawData = await res.json();
        const data = rawData.results ? rawData.results : (Array.isArray(rawData) ? rawData : []);
        
        const tasks = {};
        const columns = { 
          'Pending': { id: 'Pending', title: 'Pending', taskIds: [] }, 
          'Under Review': { id: 'Under Review', title: 'Under Review', taskIds: [] }, 
          'Interview Scheduled': { id: 'Interview Scheduled', title: 'Interview Scheduled', taskIds: [] }, 
          'Approved': { id: 'Approved', title: 'Approved', taskIds: [] },
          'Rejected': { id: 'Rejected', title: 'Rejected', taskIds: [] },
          'Cancelled': { id: 'Cancelled', title: 'Cancelled', taskIds: [] }
        };
        data.forEach(app => {
          const taskId = `app-${app.id}`;
          tasks[taskId] = { 
            ...app, 
            id: taskId, 
            dbId: app.id,
            applicant: app.applicant_name,
            animal: app.animal_detail?.name || 'Unknown',
            breed: app.animal_detail?.breed || '',
            animal_detail: app.animal_detail || {}
          };
          if (columns[app.status]) columns[app.status].taskIds.push(taskId);
          else columns['Pending'].taskIds.push(taskId);
        });
        setKanban({ 
          columnOrder: ['Pending', 'Under Review', 'Interview Scheduled', 'Approved', 'Rejected', 'Cancelled'], 
          columns, 
          tasks 
        });
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    fetchNearbyAlerts(); 
    fetchApps();
    
    // Connect to WebSocket for real-time SOS alerts
    const ws = new WebSocket('ws://localhost:8000/ws/shelter/dashboard/');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'sos_alert') {
        const newAlert = data.data;
        // Parse lat/lng
        let parsedLat = 10.8505; let parsedLng = 76.2711;
        let displayLoc = newAlert.location || "Unknown Location";
        if (newAlert.location && newAlert.location.includes(',')) {
          const parts = newAlert.location.split(',');
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            parsedLat = parseFloat(parts[0]); parsedLng = parseFloat(parts[1]);
            displayLoc = `Lat: ${parsedLat.toFixed(4)}, Lng: ${parsedLng.toFixed(4)}`;
          }
        }
        
        const formattedAlert = { 
          ...newAlert, 
          lat: parsedLat, 
          lng: parsedLng, 
          location: displayLoc,
          is_new: true 
        };
        
        setNearbyAlerts(prev => [formattedAlert, ...prev]);
        setNewAlertNotification(formattedAlert);
        setTimeout(() => setNewAlertNotification(null), 8000); 
      }
    };
    
    return () => ws.close();
  }, [authFetch]);

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
    setKanban(prev => ({ ...prev, tasks: { ...prev.tasks, [draggableId]: { ...task, status: destination.droppableId } } }));
    authFetch(`http://localhost:8000/api/shelter/applications/${task.dbId}/update_status/`, { method: 'PATCH', body: JSON.stringify({ status: destination.droppableId }) }).catch(e => console.error("Mock fallback"));
  };

  const handleApplicationAction = async (newStatus, feedback = '') => {
    if (!selectedApplication) return;
    
    const taskId = selectedApplication.id;
    const oldStatus = selectedApplication.status || 'Pending';
    
    const startColumn = kanban.columns[oldStatus] || kanban.columns['Pending'];
    const finishColumn = kanban.columns[newStatus];
    
    if (!finishColumn) {
      console.error("Invalid destination column:", newStatus);
      return;
    }

    const startTaskIds = Array.from(startColumn.taskIds);
    const indexToRemove = startTaskIds.indexOf(taskId);
    if(indexToRemove !== -1) startTaskIds.splice(indexToRemove, 1);
    
    const finishTaskIds = Array.from(finishColumn.taskIds);
    if (!finishTaskIds.includes(taskId)) finishTaskIds.push(taskId);
    
    const updatedTask = { ...selectedApplication, status: newStatus, feedback: feedback || selectedApplication.feedback };
    
    setKanban(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [taskId]: updatedTask },
      columns: {
        ...prev.columns,
        [startColumn.id]: { ...startColumn, taskIds: startTaskIds },
        [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds }
      }
    }));
    
    try {
       await authFetch(`http://localhost:8000/api/shelter/applications/${selectedApplication.dbId}/update_status/`, { 
         method: 'POST', 
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ status: newStatus, feedback: feedback }) 
       });
    } catch (e) { console.error("Update status error:", e); }

    setSelectedApplication(updatedTask);
    setIsRejecting(false);
    setIsScheduling(false);
    setRejectionFeedback('');
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

  const startEditing = (pet) => {
    const parts = (pet.age || '0:0:0').split(':');
    setEditData({
      ...pet,
      age_y: parts[0] || '',
      age_m: parts[1] || '',
      age_d: parts[2] || ''
    });
    setIsEditing(true);
  };

  const handleUpdatePetAction = (fields) => {
    const finalData = { ...fields };
    if (fields.age_y !== undefined || fields.age_m !== undefined || fields.age_d !== undefined) {
      finalData.age = `${fields.age_y || '0'}:${fields.age_m || '0'}:${fields.age_d || '0'}`;
    }
    handleUpdatePet(finalData);
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

  const handleAcceptMission = async (alert) => {
    setIsProcessingRescue(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/citizens/sos/${alert.id}/accept_mission/`, { method: 'POST' });
      if (res.ok) {
        fetchNearbyAlerts();
        setSelectedMapAlert(null);
        alert("Mission Accepted. You are now the primary responder.");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to accept mission.");
      }
    } catch (err) { console.error(err); }
    finally { setIsProcessingRescue(false); }
  };

  const handleCancelMission = async (alert) => {
    setIsProcessingRescue(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/citizens/sos/${alert.id}/cancel_mission/`, { method: 'POST' });
      if (res.ok) {
        fetchNearbyAlerts();
        setSelectedMapAlert(null);
        alert("Mission Canceled. It is now back to pending status.");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel mission.");
      }
    } catch (err) { console.error(err); }
    finally { setIsProcessingRescue(false); }
  };

  const handleCompleteMissionAndIntake = async (e) => {
    e.preventDefault();
    setIsProcessingRescue(true);
    try {
      // 1. Create Inventory Record
      const invRes = await authFetch('http://localhost:8000/api/shelter/inventory/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...intakeForm,
          age: `${intakeForm.age_y || '0'}:${intakeForm.age_m || '0'}:${intakeForm.age_d || '0'}`,
          price: parseFloat(intakeForm.price)
        })
      });
      
      if (invRes.ok) {
         // 2. Resolve the SOS alert
         const sosRes = await authFetch(`http://localhost:8000/api/citizens/sos/${missionToIntake.id}/complete_mission/`, { method: 'POST' });
         if (sosRes.ok) {
            fetchNearbyAlerts();
            fetchInventory();
            setMissionToIntake(null);
            alert("Rescue Complete! Animal successfully admitted to inventory.");
         }
      } else {
         const errData = await invRes.json();
         console.error("Intake Error:", errData);
         alert("Registration Failed: " + JSON.stringify(errData));
      }
    } catch (err) { console.error(err); }
    finally { setIsProcessingRescue(false); }
  };

  const handleIntakeFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setIntakeForm({ ...intakeForm, media_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const openDirections = (alert) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${alert.lat},${alert.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const generateCapacitySlots = () => {
    const activeInventory = inventory.filter(pet => !pet.is_adopted);
    const slots = [];
    const midPoint = Math.floor(totalCapacity / 2);
    for (let i = 1; i <= totalCapacity; i++) {
      const pet = activeInventory[i-1];
      const isOccupied = !!pet;
      slots.push({ 
        id: i, 
        status: isOccupied ? 'Occupied' : 'Available', 
        pet: isOccupied ? pet : null, 
        zone: isOccupied && pet.kennel_zone_id ? pet.kennel_zone_id : (i <= midPoint ? 'Zone Alpha' : 'Zone Beta') 
      });
    }
    return slots;
  };

  const capacitySlots = generateCapacitySlots();

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col pt-16 relative">
      
      {/* Real-time Emergency Toast */}
      <AnimatePresence>
         {newAlertNotification && (
            <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} 
               className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md bg-red-600 border border-red-500 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.5)] p-5 flex items-center gap-5 backdrop-blur-md">
               <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-red-600 animate-pulse">
                  <BellRing size={28} />
               </div>
               <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded text-white">New SOS from {newAlertNotification.reporter_name || 'Citizen'}</span>
                  </div>
                  <p className="font-bold text-white leading-tight">{newAlertNotification.animal_description}</p>
                  <p className="text-xs text-red-100 mt-1 flex items-center gap-1"><MapPin size={12}/> {newAlertNotification.location}</p>
               </div>
               <button onClick={() => { setSelectedMapAlert(newAlertNotification); setNewAlertNotification(null); }} className="bg-white text-red-600 px-4 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform">
                  VIEW MAP
               </button>
            </motion.div>
         )}
      </AnimatePresence>

      <header className="bg-neutral-800 p-6 border-b border-neutral-700 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400 flex items-center gap-3"><PawPrint size={32} /> Shelter Command Center</h1>
          <div className="flex gap-2 items-center mt-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1">
              📍 Local Body: {user?.zone || 'Kollam Corporation'}
            </span>
          </div>
          <p className="text-neutral-400 mt-1.5">Operational control for rescues and adoptions.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-700 flex items-center gap-3">
              <Zap size={18} className="text-amber-400" />
              <div>
                 <p className="text-[10px] text-neutral-500 uppercase font-black">Live Pulse</p>
                 <p className="text-xs text-amber-400 font-bold">10s REFRESH</p>
              </div>
           </div>
        </div>
      </header>

      <div className="flex-1 flex px-8 py-6 gap-8 overflow-hidden">
        <aside className="w-64 flex flex-col gap-3">
          {[
            { id: 'rescue', icon: AlertCircle, label: 'Rescue Missions', count: nearbyAlerts.filter(a => a.status !== 'Resolved').length, color: 'text-red-400' },
            { id: 'kanban', icon: Activity, label: 'Adoption Pipeline', color: 'text-emerald-400' },
            { id: 'inventory', icon: PawPrint, label: 'Animal Inventory', color: 'text-emerald-400' },
            { id: 'capacity', icon: LayoutGrid, label: 'Capacity Tracker', color: 'text-emerald-400' },
            { id: 'adopted', icon: CheckCircle, label: 'Completed Adoptions', color: 'text-emerald-400' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`p-4 rounded-xl flex items-center justify-between transition-all group ${activeTab === tab.id ? 'bg-emerald-600 shadow-lg shadow-emerald-900/20' : 'bg-neutral-800/50 hover:bg-neutral-800 border border-transparent hover:border-neutral-700'}`}>
              <div className="flex items-center gap-3"><tab.icon size={20} className={activeTab === tab.id ? 'text-white' : tab.color} /><span className={`text-sm font-medium ${activeTab === tab.id ? 'text-white' : 'text-neutral-400'}`}>{tab.label}</span></div>
              {tab.id === 'rescue' && nearbyAlerts.filter(a => a.status !== 'Resolved').length > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{nearbyAlerts.filter(a => a.status !== 'Resolved').length}</span>}
            </button>
          ))}
        </aside>

        <main className="flex-1 bg-neutral-800/30 rounded-2xl p-6 border border-neutral-700/50 backdrop-blur-sm shadow-xl flex flex-col relative overflow-hidden">
          {activeTab === 'rescue' && (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2"><AlertCircle className="text-red-400"/> Critical SOS Alerts</h2>
                <div className="flex items-center gap-2 bg-red-600/10 px-3 py-1 rounded-full border border-red-500/20">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                   <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Scanning for Emergencies</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                 {nearbyAlerts.filter(a => a.status !== 'Resolved').map(alert => (
                    <div key={alert.id} className={`bg-neutral-900 border-l-4 p-6 rounded-xl flex justify-between items-center transition-all group relative overflow-hidden ${alert.status === 'Accepted' ? 'border-amber-500' : alert.is_new ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-neutral-700'}`}>
                       {alert.status === 'Accepted' && <div className="absolute top-2 right-2 bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> IN PROGRESS</div>}
                       {alert.is_new && alert.status === 'Pending' && <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded">NEW</div>}
                       <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-2 text-emerald-400">
                                <UserCircle size={16} />
                                <span className="text-xs font-black uppercase tracking-tighter">Reporter: {alert.reporter_name || 'Citizen'}</span>
                             </div>
                             <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-bold">
                                <Clock size={10} /> {new Date(alert.timestamp).toLocaleTimeString()}
                             </div>
                          </div>
                          <p className="text-lg font-bold text-white mb-2 leading-tight">{alert.animal_description}</p>
                          <div className="flex items-center gap-3">
                             <div className="flex items-center gap-2 text-neutral-400 text-sm">
                                <MapPin size={14} className="text-red-400" />
                                <span>{alert.location}</span>
                             </div>
                             {alert.assigned_shelter_name && (
                                <div className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700 text-amber-400 font-bold">
                                   OWNED BY: {alert.assigned_shelter_name}
                                </div>
                             )}
                          </div>
                       </div>
                       <div className="flex gap-3">
                          <button onClick={() => setSelectedMapAlert(alert)} className="bg-neutral-800 hover:bg-neutral-700 p-3 rounded-xl font-black transition-all border border-neutral-700 text-neutral-300">
                             <MapIcon size={20} />
                          </button>
                          {alert.status === 'Pending' ? (
                             <button onClick={() => handleAcceptMission(alert)} disabled={isProcessingRescue} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                                <Handshake size={18} /> ACCEPT
                             </button>
                          ) : (
                             <div className="flex gap-2">
                               <button onClick={() => handleCancelMission(alert)} disabled={isProcessingRescue} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-3 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg">
                                  <X size={18} /> CANCEL
                               </button>
                               <button onClick={() => { setMissionToIntake(alert); setIntakeForm({...intakeForm, species: alert.animal_description.split(':')[0] || 'Dog', breed: '' }); }} disabled={isProcessingRescue} className="bg-emerald-500 hover:bg-emerald-400 px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                                  <CheckSquare size={18} /> COMPLETE & INTAKE
                               </button>
                             </div>
                          )}
                       </div>
                    </div>
                 ))}
                 {nearbyAlerts.filter(a => a.status !== 'Resolved').length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-600">
                       <Shield size={48} className="mb-4 opacity-20" />
                       <p className="font-bold">No active missions in your sector.</p>
                       <p className="text-xs">Scanning frequencies...</p>
                    </div>
                 )}
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
                      <div key={column.id} className="bg-neutral-900/50 rounded-2xl p-4 w-80 flex-shrink-0 border border-neutral-700 flex flex-col">
                        <div className="flex justify-between items-center mb-4 px-1">
                          <h3 className="font-bold text-sm text-neutral-400 uppercase tracking-widest">{column.title}</h3>
                          <span className="bg-neutral-800 text-neutral-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{tasks.length}</span>
                        </div>
                        <Droppable droppableId={column.id}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 min-h-[200px] flex flex-col gap-4">
                              {tasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div 
                                      ref={provided.innerRef} 
                                      {...provided.draggableProps} 
                                      {...provided.dragHandleProps} 
                                      style={{
                                        ...provided.draggableProps.style,
                                        cursor: 'grab',
                                        zIndex: snapshot.isDragging ? 1000 : 1,
                                        opacity: snapshot.isDragging ? 0.95 : 1,
                                      }}
                                      className={`bg-neutral-800 p-5 rounded-xl border border-neutral-700 shadow-lg flex flex-col gap-3 ${snapshot.isDragging ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/20 scale-[1.02]' : 'hover:border-emerald-500/50'}`}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400"><User size={20} /></div>
                                          <div>
                                            <h4 className="font-bold text-white text-sm">{task.applicant_name}</h4>
                                            <div className="flex items-center gap-1 text-neutral-500 text-[10px] mt-0.5"><Mail size={10} /> {task.applicant_email || 'No email provided'}</div>
                                          </div>
                                        </div>
                                        <button onClick={() => setSelectedApplication(task)} className="p-1.5 rounded-lg bg-neutral-900 text-neutral-500 hover:text-emerald-400 hover:bg-neutral-700 transition-all"><ExternalLink size={14} /></button>
                                      </div>
                                        <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50 flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            {task.animal_detail?.media_url ? (
                                              <img src={task.animal_detail.media_url} className="w-6 h-6 rounded-full object-cover border border-neutral-700" />
                                            ) : (
                                              <PawPrint size={14} className="text-emerald-500" />
                                            )}
                                            <span className="text-white text-xs font-bold">{task.animal}</span>
                                          </div>
                                          <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider truncate max-w-[100px]">{task.breed}</span>
                                        </div>
                                      <div className="text-[10px] text-neutral-600">Applied: {new Date(task.applied_at || task.timestamp).toLocaleDateString()}</div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
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
                    {inventory.filter(pet => !pet.is_adopted).map(pet => (
                       <div key={pet.id} className="bg-neutral-900/80 border border-neutral-700/50 rounded-2xl p-5 flex items-center gap-8 hover:bg-neutral-900 transition-all"><div className="w-24 h-24 rounded-2xl overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700"><img src={pet.media_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&h=200&fit=crop'} alt={pet.name} className="w-full h-full object-cover" /></div><div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6"><div className="min-w-[180px]"><h4 className="text-white font-black text-xl leading-tight">{pet.name}</h4><p className="text-neutral-500 text-sm font-medium mt-1">{pet.species} • {pet.breed || 'Unknown'} {pet.age ? `• ${pet.age.split(':').map((v,i) => v !== '0' ? v + (['y','m','d'][i]) : '').filter(Boolean).join(' ')}` : ''}</p></div><div className="grid grid-cols-2 lg:grid-cols-3 gap-8 flex-1"><div><p className="text-[10px] text-neutral-600 uppercase font-black mb-1">Health Status</p><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${pet.medical_triage_status === 'Healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} /><span className="text-sm font-bold text-neutral-300">{pet.medical_triage_status}</span></div></div><div><p className="text-[10px] text-neutral-600 uppercase font-black mb-1">Intake Date</p><p className="text-sm font-bold text-neutral-300">{new Date(pet.intake_date).toLocaleDateString()}</p></div><div className="hidden lg:block"><p className="text-[10px] text-neutral-600 uppercase font-black mb-1">Market Status</p><div className={`flex items-center gap-1.5 font-black text-sm ${pet.is_available ? 'text-emerald-400' : 'text-neutral-500'}`}><Tag size={14} /> {pet.is_available ? `Listed` : 'Rescued'}</div></div></div></div><div className="flex gap-3"><button onClick={() => { setSelectedPet(pet); setIsEditing(false); }} className="p-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-all border border-neutral-700"><Info size={18} /></button></div></div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'adopted' && (
             <div className="h-full flex flex-col">
               <h2 className="text-2xl font-bold mb-8 flex items-center gap-2"><CheckCircle className="text-emerald-400"/> Completed Adoptions</h2>
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 gap-4 pb-6">
                     {Object.values(kanban.tasks).filter(task => task.status === 'Approved').map(task => (
                        <div key={task.id} className="bg-neutral-900/80 border border-emerald-500/30 rounded-2xl p-5 flex items-center gap-8 hover:bg-neutral-900 transition-all">
                           <div className="w-24 h-24 rounded-2xl overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700">
                              <img src={task.animal_detail?.media_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&h=200&fit=crop'} alt={task.animal} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1 flex flex-col md:flex-row justify-between gap-6">
                              <div className="min-w-[180px]">
                                 <h4 className="text-white font-black text-xl leading-tight">{task.animal}</h4>
                                 <p className="text-neutral-500 text-sm font-medium mt-1">{task.breed || 'Unknown Breed'}</p>
                              </div>
                              <div className="flex-1 grid grid-cols-2 gap-8 border-l border-neutral-700 pl-8">
                                 <div>
                                    <p className="text-[10px] text-neutral-600 uppercase font-black mb-1 flex items-center gap-1"><User size={12} className="text-emerald-400" /> Receiver Details</p>
                                    <p className="text-sm font-bold text-white">{task.applicant_name}</p>
                                    <p className="text-xs text-neutral-400">{task.applicant_email || 'No email provided'}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] text-neutral-600 uppercase font-black mb-1 flex items-center gap-1"><Calendar size={12} className="text-emerald-400" /> Adoption Date</p>
                                    <p className="text-sm font-bold text-emerald-400">{new Date(task.applied_at || task.timestamp).toLocaleDateString()}</p>
                                 </div>
                              </div>
                           </div>
                           <div className="flex gap-3">
                              <button onClick={() => setSelectedApplication(task)} className="p-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-all border border-neutral-700"><ExternalLink size={18} /></button>
                           </div>
                        </div>
                     ))}
                     {Object.values(kanban.tasks).filter(task => task.status === 'Approved').length === 0 && (
                        <div className="text-center py-20">
                           <Heart size={48} className="mx-auto text-neutral-700 mb-4" />
                           <p className="text-neutral-500 font-bold">No completed adoptions yet.</p>
                        </div>
                     )}
                  </div>
               </div>
             </div>
          )}

          {activeTab === 'capacity' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
              <div className="flex justify-between items-end mb-8">
                <div><h2 className="text-3xl font-black text-white flex items-center gap-3"><Home className="text-emerald-400" size={32}/> Facility Control Center</h2><p className="text-neutral-500 font-bold mt-1 uppercase tracking-widest text-xs">Dynamic Capacity & Grid Management</p></div>
                <div className="flex items-center gap-6"><div className="text-right"><p className="text-[10px] text-neutral-600 uppercase font-black mb-1">Overall Occupancy</p><h3 className="text-4xl font-black text-emerald-400">{inventory.filter(pet => !pet.is_adopted).length} <span className="text-neutral-600">/ {totalCapacity}</span></h3></div><button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-3 bg-neutral-900 border border-neutral-700 rounded-xl hover:bg-neutral-800 transition-all text-neutral-400 hover:text-white"><Settings size={24} /></button></div>
              </div>
              <AnimatePresence>{isSettingsOpen && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-8"><div className="bg-neutral-900 p-6 rounded-2xl border border-emerald-500/20 flex justify-between items-center"><div><h4 className="font-black text-white uppercase tracking-widest text-sm">Scale Facility Capacity</h4><p className="text-neutral-500 text-xs mt-1">Adjust total units for the entire shelter.</p></div><div className="flex items-center gap-4"><button onClick={() => setTotalCapacity(Math.max(1, totalCapacity - 5))} className="p-3 bg-neutral-800 hover:bg-red-600/20 text-red-400 rounded-xl transition-all border border-neutral-700"><Minus size={20} /></button><div className="w-20 text-center font-black text-2xl text-white">{totalCapacity}</div><button onClick={() => setTotalCapacity(totalCapacity + 5)} className="p-3 bg-neutral-800 hover:bg-emerald-600/20 text-emerald-400 rounded-xl transition-all border border-neutral-700"><Plus size={20} /></button></div></div></motion.div>)}</AnimatePresence>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar"><div className="grid grid-cols-5 md:grid-cols-10 gap-3 pb-4">{capacitySlots.map(slot => (<div key={slot.id} onClick={() => setSelectedSlot(slot)} className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all relative group cursor-pointer overflow-hidden ${slot.status === 'Occupied' ? 'bg-emerald-600/10 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-neutral-900 border-neutral-800 hover:border-emerald-500/30'}`}><span className="text-[10px] font-black text-neutral-600 mb-1 z-10 bg-neutral-900/80 px-1 rounded">{slot.id}</span>{slot.status === 'Occupied' ? (slot.pet?.media_url ? <img src={slot.pet.media_url} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" /> : <PawPrint size={20} className="text-emerald-400 z-10" />) : <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />}</div>))}</div></div>
            </motion.div>
          )}
        </main>
      </div>

      {/* Complete Rescue & Intake Modal */}
      <AnimatePresence>
         {missionToIntake && (
            <div className="fixed inset-0 bg-black/90 z-[250] flex items-center justify-center p-6 backdrop-blur-xl">
               <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-neutral-900 border border-neutral-700 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.2)]">
                  <div className="bg-emerald-600 p-8 flex justify-between items-center">
                     <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Animal Intake Form</h2>
                        <p className="text-emerald-100 font-bold text-sm">Admitting rescued animal to permanent inventory.</p>
                     </div>
                     <button onClick={() => setMissionToIntake(null)} className="text-white/50 hover:text-white"><X size={32}/></button>
                  </div>
                  <form onSubmit={handleCompleteMissionAndIntake} className="p-8 grid grid-cols-2 gap-6">
                     <div className="col-span-2 bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700 mb-2">
                        <p className="text-[10px] text-neutral-500 uppercase font-black mb-1">Rescue Source</p>
                        <p className="text-sm font-bold text-emerald-400 flex items-center gap-2"><AlertCircle size={14}/> SOS Report: {missionToIntake.animal_description}</p>
                     </div>
                     
                     <div className="space-y-4">
                        <div>
                           <label className="text-[10px] text-neutral-500 uppercase font-black ml-1">Animal Name</label>
                           <input required type="text" value={intakeForm.name} onChange={e => setIntakeForm({...intakeForm, name: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white outline-none focus:border-emerald-500 transition-all" placeholder="e.g. Hope" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-[10px] text-neutral-500 uppercase font-black ml-1">Species</label>
                              <select value={intakeForm.species} onChange={e => setIntakeForm({...intakeForm, species: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white outline-none">
                                 <option>Dog</option><option>Cat</option><option>Bird</option><option>Other</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-[10px] text-neutral-500 uppercase font-black ml-1">Breed</label>
                              <input type="text" value={intakeForm.breed} onChange={e => setIntakeForm({...intakeForm, breed: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white outline-none focus:border-emerald-500" placeholder="e.g. Mixed or Unknown" />
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-[10px] text-neutral-500 uppercase font-black ml-1">Medical Condition</label>
                              <select value={intakeForm.medical_triage_status} onChange={e => setIntakeForm({...intakeForm, medical_triage_status: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white outline-none">
                                 <option>Healthy</option><option>Injured</option><option>Sick</option><option>Critical</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-[10px] text-neutral-500 uppercase font-black ml-1">Kennel Zone</label>
                              <input required type="text" value={intakeForm.kennel_zone_id} onChange={e => setIntakeForm({...intakeForm, kennel_zone_id: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white outline-none focus:border-emerald-500" placeholder="e.g. Zone A-1" />
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col gap-4">
                        <label className="text-[10px] text-neutral-500 uppercase font-black ml-1">Photography</label>
                        <div onClick={() => document.getElementById('intake-photo').click()} className="flex-1 bg-neutral-800 border-2 border-dashed border-neutral-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-all overflow-hidden relative">
                           {intakeForm.media_url ? (
                              <img src={intakeForm.media_url} className="w-full h-full object-cover" alt="Preview" />
                           ) : (
                              <>
                                 <Camera size={32} className="text-neutral-600 mb-2" />
                                 <span className="text-xs text-neutral-600 font-bold uppercase">Upload Photo</span>
                              </>
                           )}
                           <input type="file" id="intake-photo" hidden onChange={handleIntakeFileChange} accept="image/*" />
                        </div>
                     </div>

                     <div className="col-span-2 pt-4">
                        <button type="submit" disabled={isProcessingRescue} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/40 transition-all active:scale-95">
                           {isProcessingRescue ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />}
                           FINISH RESCUE & SAVE TO INVENTORY
                        </button>
                        <p className="text-center text-[10px] text-neutral-600 mt-4 font-bold uppercase tracking-widest">This action will resolve the SOS alert and update facility records.</p>
                     </div>
                  </form>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

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
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Pet Detail & Management Modal */}
      <AnimatePresence>
        {selectedPet && (
          <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-neutral-900 rounded-3xl w-full max-w-4xl overflow-hidden border border-neutral-700 shadow-2xl flex flex-col md:flex-row">
               <div className="md:w-2/5 h-64 md:h-auto relative"><img src={selectedPet.media_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=800&fit=crop'} alt={selectedPet.name} className="w-full h-full object-cover" /><div className="absolute top-4 left-4"><span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${selectedPet.is_available ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>{selectedPet.is_available ? 'Live on Market' : 'Internal Inventory'}</span></div></div>
               <div className="md:w-3/5 p-8 flex flex-col overflow-y-auto max-h-[90vh] overflow-x-hidden"><div className="flex justify-between items-start mb-6">{isEditing ? (<div className="flex-1 mr-4"><input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-2xl font-black text-white outline-none focus:border-emerald-500 mb-2" placeholder="Animal Name" /><div className="flex flex-wrap gap-2"><input type="text" value={editData.species} onChange={e => setEditData({...editData, species: e.target.value})} className="flex-1 min-w-[80px] bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm text-neutral-400 outline-none" placeholder="Species" /><input type="text" value={editData.breed} onChange={e => setEditData({...editData, breed: e.target.value})} className="flex-1 min-w-[80px] bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm text-neutral-400 outline-none" placeholder="Breed" /><div className="flex gap-1 items-center bg-neutral-800 border border-neutral-700 rounded-lg px-2"><input type="number" min="0" placeholder="Y" value={editData.age_y} onChange={e => setEditData({...editData, age_y: Math.max(0, e.target.value)})} className="w-10 bg-transparent p-2 text-sm text-neutral-400 outline-none text-center" /><span className="text-neutral-600">:</span><input type="number" min="0" placeholder="M" value={editData.age_m} onChange={e => setEditData({...editData, age_m: Math.max(0, e.target.value)})} className="w-10 bg-transparent p-2 text-sm text-neutral-400 outline-none text-center" /><span className="text-neutral-600">:</span><input type="number" min="0" placeholder="D" value={editData.age_d} onChange={e => setEditData({...editData, age_d: Math.max(0, e.target.value)})} className="w-10 bg-transparent p-2 text-sm text-neutral-400 outline-none text-center" /></div></div></div>) : (<div><h2 className="text-4xl font-black text-white">{selectedPet.name}</h2><p className="text-neutral-500 font-bold mt-1 text-lg">{selectedPet.species} • {selectedPet.breed || 'Unknown'} {selectedPet.age ? `• Age: ${selectedPet.age.split(':').map((v,i) => v !== '0' ? v + (['y','m','d'][i]) : '').filter(Boolean).join(' ')}` : ''}</p></div>)}<button onClick={() => setSelectedPet(null)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors"><X size={24} className="text-neutral-500" /></button></div><div className="grid grid-cols-2 gap-6 mb-8"><div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700"><p className="text-[10px] text-neutral-600 uppercase font-black mb-1 text-emerald-500">Health Status</p>{isEditing ? (<select value={editData.medical_triage_status} onChange={e => setEditData({...editData, medical_triage_status: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-sm font-bold text-emerald-400 outline-none"><option value="Healthy">Healthy</option><option value="Injured">Injured</option><option value="Sick">Sick</option><option value="Critical">Critical</option><option value="Recovering">Recovering</option></select>) : (<div className="flex items-center gap-2 text-emerald-400 font-bold"><Heart size={16}/> {selectedPet.medical_triage_status}</div>)}</div><div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700"><p className="text-[10px] text-neutral-600 uppercase font-black mb-1">Market Price</p>{isEditing ? (<div className="flex items-center gap-2"><span className="text-neutral-500">$</span><input type="number" min="0" value={editData.price} onChange={e => setEditData({...editData, price: Math.max(0, e.target.value)})} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-sm font-bold text-white outline-none" /></div>) : (<div className="flex items-center gap-2 text-white font-bold"><span className="text-emerald-500">$</span>{Number(selectedPet.price).toFixed(2)} ({selectedPet.listing_type})</div>)}</div></div><div className="mt-auto space-y-4"><div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPet.is_available ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-400'}`}><Activity size={24} /></div><div className="flex-1"><p className="text-xs font-bold text-white">{selectedPet.is_available ? 'Live on Market' : 'Internal Inventory'}</p><p className="text-[10px] text-neutral-500">Currently {selectedPet.is_available ? 'Visible' : 'Hidden'} from public eyes.</p></div><button onClick={() => handleUpdatePet({ is_available: !selectedPet.is_available })} disabled={isUpdatingPet} className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${selectedPet.is_available ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>{isUpdatingPet ? 'SYNCING...' : selectedPet.is_available ? 'UNPUBLISH' : 'PUBLISH LIVE'}</button></div><div className="flex gap-4">{isEditing ? (<button onClick={() => handleUpdatePetAction(editData)} disabled={isUpdatingPet} className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-2"><Save size={18} /> Save Changes</button>) : (<button onClick={() => startEditing(selectedPet)} className="flex-1 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold border border-neutral-700 transition-all flex items-center justify-center gap-2"><Edit3 size={18} /> Edit Details</button>)}<button onClick={handleRemovePet} disabled={isUpdatingPet} className="flex-1 py-3.5 rounded-2xl bg-red-600/10 hover:bg-red-600/20 text-red-400 font-bold border border-red-500/30 transition-all flex items-center justify-center gap-2"><Trash2 size={18} /> Remove Pet</button></div>{isEditing && <button onClick={() => setIsEditing(false)} className="w-full py-2 text-neutral-500 text-xs hover:text-white transition-colors">Cancel Editing</button>}</div></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Map Modal */}
      {selectedMapAlert && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-neutral-900 rounded-3xl w-full max-w-4xl overflow-hidden border border-neutral-700 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-900">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white"><MapPin className="text-red-400" /> Rescue Location Tracker</h3>
              <button onClick={() => setSelectedMapAlert(null)} className="text-neutral-400 hover:text-white transition-colors text-2xl font-light">&times;</button>
            </div>
            <div className="h-[500px] w-full bg-neutral-800 relative">
              <MapContainer 
                center={[selectedMapAlert.lat, selectedMapAlert.lng]} 
                zoom={15} 
                scrollWheelZoom={false} 
                minZoom={7}
                maxBounds={KERALA_BOUNDS}
                maxBoundsViscosity={1.0}
                style={{ height: '100%', width: '100%', zIndex: 10 }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <GeoJSON data={invertedKeralaData} style={{ color: 'transparent', fillColor: '#171717', fillOpacity: 0.95 }} interactive={false} />
                <GeoJSON data={keralaData} style={{ color: '#047857', weight: 8, opacity: 0.4, fillColor: 'transparent' }} interactive={false} />
                <GeoJSON data={keralaData} style={{ color: '#34d399', weight: 3, opacity: 1, fillColor: 'transparent' }} interactive={false} />
                <Marker position={[selectedMapAlert.lat, selectedMapAlert.lng]}>
                  <Popup><div className="font-bold text-neutral-800">SOS Location</div><p className="text-xs text-neutral-600">{selectedMapAlert.location}</p></Popup>
                </Marker>
              </MapContainer>
            </div>
            <div className="p-6 bg-neutral-900 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-neutral-600 uppercase font-black">Target Address</p>
                <p className="text-sm font-bold text-neutral-400">{selectedMapAlert.location}</p>
                {selectedMapAlert.status === 'Accepted' && (
                   <p className="text-xs text-amber-500 font-bold mt-1 uppercase tracking-widest">Under Rescue by: {selectedMapAlert.assigned_shelter_name}</p>
                )}
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => openDirections(selectedMapAlert)} 
                  className="bg-neutral-800 hover:bg-neutral-700 px-6 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg border border-neutral-700 transition-all active:scale-95 text-neutral-300"
                >
                  <MapIcon size={18} /> DIRECTIONS
                </button>
                {selectedMapAlert.status === 'Pending' ? (
                   <button 
                     onClick={() => handleAcceptMission(selectedMapAlert)} 
                     className="bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                   >
                     <Handshake size={18} /> ACCEPT MISSION
                   </button>
                ) : (
                   <div className="flex gap-3">
                     <button 
                       onClick={() => handleCancelMission(selectedMapAlert)} 
                       className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all active:scale-95"
                     >
                       <X size={18} /> CANCEL
                     </button>
                     <button 
                       onClick={() => { setMissionToIntake(selectedMapAlert); setSelectedMapAlert(null); }} 
                       className="bg-emerald-500 hover:bg-emerald-400 px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                     >
                       <CheckSquare size={18} /> COMPLETE RESCUE
                     </button>
                   </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Application Details Modal */}
      <AnimatePresence>
         {selectedApplication && (
            <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedApplication(null)}>
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-neutral-900 border border-neutral-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                  <div className="bg-neutral-800 p-6 flex justify-between items-center border-b border-neutral-700">
                     <h3 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2"><User size={16} className="text-emerald-400"/> Application File</h3>
                     <button onClick={() => setSelectedApplication(null)} className="text-neutral-500 hover:text-white transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-8">
                     <div className="flex items-center gap-4 mb-8 pb-8 border-b border-neutral-800">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                           <User size={32} />
                        </div>
                        <div>
                           <p className="text-[10px] text-neutral-500 uppercase font-black">Applicant Profile</p>
                           <h4 className="text-2xl font-black text-white">{selectedApplication.applicant_name}</h4>
                           <div className="flex items-center gap-2 text-neutral-400 text-sm mt-1">
                              <Mail size={14} /> {selectedApplication.applicant_email || 'Verified Citizen'}
                           </div>
                        </div>
                     </div>
                     
                     <div className="bg-neutral-800/50 rounded-2xl p-6 border border-neutral-700 mb-8">
                        <p className="text-[10px] text-neutral-500 uppercase font-black mb-4 tracking-widest flex items-center gap-2"><PawPrint size={12}/> Requested Animal</p>
                        <div className="flex items-center gap-4">
                           {selectedApplication.animal_detail?.media_url ? (
                              <img src={selectedApplication.animal_detail.media_url} className="w-16 h-16 rounded-xl object-cover border border-neutral-700" alt="Pet" />
                           ) : (
                              <div className="w-16 h-16 rounded-xl bg-neutral-900 flex items-center justify-center border border-neutral-700"><PawPrint size={24} className="text-emerald-500/50" /></div>
                           )}
                           <div className="flex-1">
                              <h5 className="text-xl font-black text-white">{selectedApplication.animal}</h5>
                              <p className="text-sm font-bold text-neutral-400 mt-1">{selectedApplication.breed || 'Unknown Breed'}</p>
                           </div>
                           <div className="text-right">
                              <span className="text-[10px] text-neutral-500 uppercase font-black block mb-1">Status</span>
                              <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase">{selectedApplication.status}</span>
                           </div>
                        </div>
                        {selectedApplication.status === 'Approved' && (
                           <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
                              <h6 className="text-emerald-400 font-black text-sm mb-2 flex items-center gap-2"><CheckCircle size={14} /> ADOPTION FINALIZED</h6>
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                 <div>
                                    <p className="text-[10px] text-neutral-500 uppercase font-black">Date Finalized</p>
                                    <p className="text-sm text-white font-bold">{new Date(selectedApplication.timestamp).toLocaleDateString()}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] text-neutral-500 uppercase font-black">Age at Adoption</p>
                                    <p className="text-sm text-white font-bold">
                                      {selectedApplication.animal_detail?.age 
                                          ? selectedApplication.animal_detail.age.split(':').map((v,i) => v !== '0' ? v + (['y','m','d'][i]) : '').filter(Boolean).join(' / ') 
                                          : 'Unknown'}
                                    </p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] text-neutral-500 uppercase font-black">Citizen Location</p>
                                    <p className="text-sm text-white font-bold">{selectedApplication.applicant_address || 'Not Provided'}</p>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        {isRejecting ? (
                           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                              <div className="bg-neutral-800 p-4 rounded-2xl border border-red-500/30">
                                 <label className="text-[10px] text-red-400 uppercase font-black mb-2 block">Rejection Feedback</label>
                                 <textarea 
                                    value={rejectionFeedback}
                                    onChange={e => setRejectionFeedback(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-sm outline-none focus:border-red-500 min-h-[100px]"
                                    placeholder="Provide a reason for the applicant..."
                                 />
                                 <div className="flex flex-wrap gap-2 mt-3">
                                    {['Insufficient space', 'Incompatible lifestyle', 'Missing documentation', 'Home visit failed'].map(suggestion => (
                                       <button 
                                          key={suggestion}
                                          onClick={() => setRejectionFeedback(suggestion)}
                                          className="text-[10px] bg-neutral-700 hover:bg-neutral-600 text-neutral-300 px-2 py-1 rounded transition-colors"
                                       >
                                          {suggestion}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                              <div className="flex gap-3">
                                 <button className="flex-1 bg-neutral-800 text-white font-bold py-3 rounded-xl hover:bg-neutral-700 transition-all" onClick={() => setIsRejecting(false)}>Back</button>
                                 <button className="flex-1 bg-red-600 text-white font-black py-3 rounded-xl hover:bg-red-500 transition-all" onClick={() => handleApplicationAction('Rejected', rejectionFeedback)}>Confirm Rejection</button>
                              </div>
                           </motion.div>
                        ) : isScheduling ? (
                           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                              <div className="bg-neutral-800 p-4 rounded-2xl border border-emerald-500/30">
                                 <label className="text-[10px] text-emerald-400 uppercase font-black mb-2 block">Interview Date</label>
                                 <input 
                                    type="datetime-local" 
                                    value={interviewDate}
                                    onChange={e => setInterviewDate(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500 mb-4"
                                 />
                                 <label className="text-[10px] text-emerald-400 uppercase font-black mb-2 block">Location</label>
                                 <input 
                                    type="text" 
                                    value={interviewLocation}
                                    onChange={e => setInterviewLocation(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500"
                                    placeholder="Shelter Facility Address"
                                 />
                              </div>
                              <div className="flex gap-3">
                                 <button className="flex-1 bg-neutral-800 text-white font-bold py-3 rounded-xl hover:bg-neutral-700 transition-all" onClick={() => setIsScheduling(false)}>Back</button>
                                 <button className="flex-1 bg-emerald-600 text-white font-black py-3 rounded-xl hover:bg-emerald-500 transition-all" onClick={() => handleApplicationAction('Interview Scheduled', `Date: ${new Date(interviewDate).toLocaleString()} at ${interviewLocation}`)}>Confirm Schedule</button>
                              </div>
                           </motion.div>
                        ) : (
                           <>
                              {selectedApplication.status === 'Pending' && (
                                 <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 w-full" onClick={() => handleApplicationAction('Under Review')}>
                                    <Search size={18} /> Review Applicant Details
                                 </button>
                              )}
                              {selectedApplication.status === 'Under Review' && (
                                 <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 w-full" onClick={() => setIsScheduling(true)}>
                                    <Calendar size={18} /> Schedule Interview
                                 </button>
                              )}
                              {selectedApplication.status === 'Interview Scheduled' && (
                                 <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 w-full" onClick={() => handleApplicationAction('Approved')}>
                                    <CheckCircle size={18} /> Complete Adoption
                                 </button>
                              )}
                              {['Pending', 'Under Review', 'Interview Scheduled'].includes(selectedApplication.status) && (
                                 <button className="text-red-400 hover:text-red-300 text-[10px] font-black uppercase tracking-widest mt-2 hover:underline" onClick={() => setIsRejecting(true)}>
                                    Reject Application
                                 </button>
                              )}
                              {['Approved'].includes(selectedApplication.status) && (
                                 <button className="bg-neutral-800 hover:bg-neutral-700 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 w-full" onClick={() => setSelectedApplication(null)}>
                                    Close File
                                 </button>
                              )}
                              {['Rejected', 'Cancelled'].includes(selectedApplication.status) && (
                                 <div className="flex gap-3">
                                    <button className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-red-500/30" onClick={() => setPdfApplication(selectedApplication)}>
                                       <ExternalLink size={18} /> Clear Details Sheet
                                    </button>
                                    <button className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2" onClick={() => setSelectedApplication(null)}>
                                       Close File
                                    </button>
                                 </div>
                              )}
                           </>
                        )}
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* PDF View Modal for Rejected/Cancelled */}
      <AnimatePresence>
         {pdfApplication && (
            <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setPdfApplication(null)}>
               <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-white text-black w-full max-w-2xl shadow-2xl rounded-sm overflow-hidden flex flex-col max-h-[90vh]">
                  {/* PDF Header / Toolbar */}
                  <div className="bg-neutral-800 p-3 flex justify-between items-center text-white shrink-0">
                     <span className="text-xs font-bold font-mono bg-neutral-700 px-2 py-1 rounded">AnimaCare_Official_{pdfApplication.status.toUpperCase()}_Notice.pdf</span>
                     <div className="flex gap-2">
                        <button className="p-1 hover:bg-neutral-700 rounded"><Download size={16} /></button>
                        <button onClick={() => setPdfApplication(null)} className="p-1 hover:bg-red-500 rounded"><X size={16}/></button>
                     </div>
                  </div>
                  
                  {/* PDF Document Body */}
                  <div className="p-10 flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
                     <div className="max-w-xl mx-auto bg-white p-8 border border-gray-200 shadow-sm relative min-h-[600px]">
                        {/* Stamp */}
                        <div className="absolute top-10 right-10 border-4 border-red-500 text-red-500 font-black text-2xl uppercase tracking-widest p-2 opacity-30 transform rotate-12">
                           {pdfApplication.status}
                        </div>

                        {/* Letterhead */}
                        <div className="border-b-2 border-emerald-800 pb-6 mb-6">
                           <div className="flex items-center gap-3 mb-2">
                              <PawPrint size={32} className="text-emerald-700" />
                              <h1 className="text-3xl font-black text-emerald-800 tracking-tighter">AnimaCare</h1>
                           </div>
                           <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Official Animal Welfare Department</p>
                        </div>

                        {/* Content */}
                        <div className="space-y-6 text-sm text-gray-800">
                           <div className="flex justify-between">
                              <div>
                                 <p className="text-xs font-bold text-gray-500 uppercase">To Applicant</p>
                                 <p className="font-black text-lg">{pdfApplication.applicant_name}</p>
                                 <p>{pdfApplication.applicant_email || 'Email not provided'}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-xs font-bold text-gray-500 uppercase">Date Issued</p>
                                 <p className="font-bold">{new Date().toLocaleDateString()}</p>
                                 <p className="text-xs mt-1 text-gray-400">Ref: AC-{pdfApplication.id}</p>
                              </div>
                           </div>

                           <div className="bg-gray-100 p-4 rounded border border-gray-200">
                              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Subject</p>
                              <p className="font-bold text-lg">Application for Adoption of {pdfApplication.animal} ({pdfApplication.breed})</p>
                           </div>

                           <div>
                              <p className="mb-4">Dear {pdfApplication.applicant_name},</p>
                              <p className="leading-relaxed mb-4">
                                 This document serves as an official notice regarding your recent adoption application. After careful review by our shelter administration team, we must inform you that your application has been officially marked as <strong>{pdfApplication.status.toUpperCase()}</strong>.
                              </p>
                              
                              <div className="bg-red-50 border-l-4 border-red-500 p-4 my-6">
                                 <p className="text-xs font-bold text-red-700 uppercase mb-2">Official Feedback / Reason</p>
                                 <p className="font-serif italic text-red-900">"{pdfApplication.feedback || 'No specific feedback provided by administration.'}"</p>
                              </div>

                              <p className="leading-relaxed">
                                 We appreciate your interest in providing a home for our rescues. If you believe this decision was made in error, or if your circumstances change, you are welcome to apply for other animals in the future.
                              </p>
                           </div>

                           <div className="pt-12 mt-12 border-t border-gray-200 flex justify-between items-end">
                              <div>
                                 <div className="w-40 border-b border-black mb-2"></div>
                                 <p className="text-xs font-bold text-gray-500 uppercase">Authorized Signature</p>
                                 <p className="font-bold text-sm">Shelter Administrator</p>
                              </div>
                              <div className="text-right">
                                 <PawPrint size={48} className="text-gray-200 inline-block" />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
