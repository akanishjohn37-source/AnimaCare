import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Activity, MapPin, PawPrint, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Fix leaflet marker icon issue in Vite (ESM) — require() is not supported
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const mockSOSAlerts = [
  { id: 1, lat: 28.7041, lng: 77.1025, info: "Injured stray dog", timestamp: "10 mins ago" },
  { id: 2, lat: 28.5355, lng: 77.3910, info: "Cat stuck in tree", timestamp: "30 mins ago" }
];

const initialKanbanState = {
  columnOrder: ['pending', 'underReview', 'interview', 'approved'],
  columns: {
    pending: { id: 'pending', title: 'Pending Applications', taskIds: ['app1', 'app2'] },
    underReview: { id: 'underReview', title: 'Under Review', taskIds: ['app3'] },
    interview: { id: 'interview', title: 'Interview Scheduled', taskIds: [] },
    approved: { id: 'approved', title: 'Approved/Rejected', taskIds: ['app4'] }
  },
  tasks: {
    app1: { id: 'app1', applicant: 'John Doe', animal: 'Max (Dog)' },
    app2: { id: 'app2', applicant: 'Jane Smith', animal: 'Bella (Cat)' },
    app3: { id: 'app3', applicant: 'Alice Johnson', animal: 'Rocky (Dog)' },
    app4: { id: 'app4', applicant: 'Bob Brown', animal: 'Luna (Cat)' }
  }
};

export default function ShelterDashboard() {
  const [activeTab, setActiveTab] = useState('sos');
  const [kanban, setKanban] = useState(initialKanbanState);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startColumn = kanban.columns[source.droppableId];
    const finishColumn = kanban.columns[destination.droppableId];

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = { ...startColumn, taskIds: newTaskIds };
      setKanban({ ...kanban, columns: { ...kanban.columns, [newColumn.id]: newColumn } });
      return;
    }

    // Moving from one list to another
    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...startColumn, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finishColumn, taskIds: finishTaskIds };

    setKanban({
      ...kanban,
      columns: { ...kanban.columns, [newStart.id]: newStart, [newFinish.id]: newFinish }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col pt-16">
      {/* Sidebar / Topnav can go here if needed, but for simplicity we'll use a tabbed interface */}
      <header className="bg-neutral-800 p-6 border-b border-neutral-700 shadow-md">
        <h1 className="text-3xl font-bold text-emerald-400 flex items-center gap-3">
          <PawPrint size={32} /> Shelter Command Center
        </h1>
        <p className="text-neutral-400 mt-2">Manage SOS alerts, applications, and animal inventory.</p>
      </header>

      <div className="flex-1 flex px-8 py-6 gap-8">
        {/* Navigation Tabs */}
        <aside className="w-64 flex flex-col gap-4">
          <button onClick={() => setActiveTab('sos')} className={`p-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'sos' ? 'bg-emerald-600 font-bold' : 'bg-neutral-800 hover:bg-neutral-700'}`}>
            <MapPin size={20} /> SOS Map Dashboard
          </button>
          <button onClick={() => setActiveTab('kanban')} className={`p-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'kanban' ? 'bg-emerald-600 font-bold' : 'bg-neutral-800 hover:bg-neutral-700'}`}>
            <Activity size={20} /> Adoption Pipeline
          </button>
          <button onClick={() => setActiveTab('inventory')} className={`p-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'inventory' ? 'bg-emerald-600 font-bold' : 'bg-neutral-800 hover:bg-neutral-700'}`}>
            <PawPrint size={20} /> Animal Inventory
          </button>
          <button onClick={() => setActiveTab('capacity')} className={`p-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'capacity' ? 'bg-emerald-600 font-bold' : 'bg-neutral-800 hover:bg-neutral-700'}`}>
            <Users size={20} /> Capacity Tracker
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-neutral-800 rounded-2xl p-6 border border-neutral-700 shadow-lg overflow-hidden relative">
          
          {activeTab === 'sos' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><MapPin className="text-red-400"/> Live SOS Alerts</h2>
              <div className="flex-1 rounded-xl overflow-hidden border border-neutral-600 relative z-10">
                <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">Carto</a>' />
                  {mockSOSAlerts.map(alert => (
                    <Marker key={alert.id} position={[alert.lat, alert.lng]}>
                      <Popup>
                        <strong className="text-red-500">SOS ALERT ({alert.timestamp})</strong><br/>
                        {alert.info}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </motion.div>
          )}

          {activeTab === 'kanban' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Activity className="text-emerald-400" /> Adoption Pipeline</h2>
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                  {kanban.columnOrder.map(columnId => {
                    const column = kanban.columns[columnId];
                    const tasks = column.taskIds.map(taskId => kanban.tasks[taskId]);

                    return (
                      <div key={column.id} className="bg-neutral-900 rounded-lg p-4 w-72 flex-shrink-0 border border-neutral-700 flex flex-col">
                        <h3 className="font-bold mb-4 text-neutral-300">{column.title}</h3>
                        <Droppable droppableId={column.id}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 min-h-[150px] flex flex-col gap-3">
                              {tasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                      className="bg-neutral-800 p-4 rounded-lg border border-neutral-600 shadow-md hover:border-emerald-500 transition-colors">
                                      <p className="font-medium text-emerald-300">{task.applicant}</p>
                                      <p className="text-sm text-neutral-400 mt-1">Applying for: {task.animal}</p>
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
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2"><PawPrint className="text-emerald-400"/> Animal Catalog</h2>
                <button className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-medium transition-colors">+ Add New Animal</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                {/* Mock Animals */}
                {[
                  { id: 1, name: 'Max', species: 'Dog', status: 'Healthy', img: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
                  { id: 2, name: 'Luna', species: 'Cat', status: 'Quarantine', img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
                  { id: 3, name: 'Rocky', species: 'Dog', status: 'Healthy', img: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' }
                ].map(animal => (
                  <div key={animal.id} className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-lg group">
                    <img src={animal.img} alt={animal.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="p-4">
                      <h3 className="text-xl font-bold text-white mb-1">{animal.name}</h3>
                      <p className="text-sm text-neutral-400 mb-3">{animal.species}</p>
                      <div className="flex justify-between items-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${animal.status === 'Healthy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {animal.status}
                        </span>
                        <button className="text-sm text-emerald-400 hover:underline">Edit Profile</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'capacity' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Users className="text-emerald-400"/> Shelter Capacity tracker</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-neutral-400 font-medium">Total Capacity</p>
                    <h3 className="text-4xl font-bold text-white mt-2">85 / 100</h3>
                  </div>
                  <CheckCircle className="text-emerald-400" size={48} />
                </div>
                <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-neutral-400 font-medium">Active Quarantine Zones</p>
                    <h3 className="text-4xl font-bold text-yellow-400 mt-2">12</h3>
                  </div>
                  <AlertCircle className="text-yellow-400" size={48} />
                </div>
                {/* More stats can be added here */}
              </div>
            </motion.div>
          )}
          
        </main>
      </div>
    </div>
  );
}
