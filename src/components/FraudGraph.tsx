import { useState, useEffect, MouseEvent } from "react";
import { Activity, Search, Landmark, Phone, Smartphone, Globe, AlertTriangle, ShieldCheck, Info, RefreshCw, Layers, Database, Loader2, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NetworkNode, NetworkLink } from "../types";

export default function FraudGraph() {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "safe" | "suspicious" | "mule_account">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "bank_account" | "phone" | "device" | "ip">("all");
  const [loading, setLoading] = useState(true);

  // Canvas zoom/pan states
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Compute a bounding box zoom-to-fit transformation
  const zoomToFit = (mappedNodesList: NetworkNode[]) => {
    if (!mappedNodesList.length) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    mappedNodesList.forEach(node => {
      if (node.x === undefined || node.y === undefined) return;
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    if (minX === Infinity || maxX === -Infinity) return;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const boxWidth = maxX - minX || 1;
    const boxHeight = maxY - minY || 1;

    // SVG viewbox dimension targets 600x400. Leave decent safety bounds.
    const scaleX = (600 - 160) / boxWidth;
    const scaleY = (400 - 160) / boxHeight;
    const fitScale = Math.min(scaleX, scaleY, 1.4); // max zoom scale on auto fit

    const tx = 600 / 2 - centerX * fitScale;
    const ty = 400 / 2 - centerY * fitScale;

    setScale(fitScale);
    setPan({ x: tx, y: ty });
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e: MouseEvent) => {
    // Only drag with left click on canvas background (not on buttons/nodes ideally)
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Load mock fraud network data from our express API endpoint
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fraud-network");
      const data = await res.json();
      
      // Dynamic grouping by syndicate identifier key prefix
      const groups: Record<string, any[]> = {
        JP: [],
        DA: [],
        FX: [],
        CRY: [],
        OTHER: []
      };

      data.nodes.forEach((node: any) => {
        if (node.id.includes("_JP")) {
          groups.JP.push(node);
        } else if (node.id.includes("_DA")) {
          groups.DA.push(node);
        } else if (node.id.includes("_FX")) {
          groups.FX.push(node);
        } else if (node.id.includes("_CRY")) {
          groups.CRY.push(node);
        } else {
          groups.OTHER.push(node);
        }
      });

      // Spatial quadrant allocations for 4 clear clusters inside 600x400 space
      const centers: Record<string, { x: number; y: number }> = {
        JP: { x: 130, y: 110 },
        DA: { x: 470, y: 110 },
        FX: { x: 130, y: 290 },
        CRY: { x: 470, y: 290 },
        OTHER: { x: 300, y: 200 }
      };

      const mappedNodes: NetworkNode[] = [];

      Object.keys(groups).forEach((groupKey) => {
        const groupNodes = groups[groupKey];
        const center = centers[groupKey];
        const count = groupNodes.length;

        groupNodes.forEach((node, index) => {
          let x = center.x;
          let y = center.y;

          if (count > 1) {
            // Circle-arc spatial placement around center
            const radius = groupKey === "OTHER" ? 85 : 55;
            const angle = (2 * Math.PI * index) / count;
            x = center.x + radius * Math.cos(angle);
            y = center.y + radius * Math.sin(angle);
          }

          mappedNodes.push({
            ...node,
            x,
            y
          });
        });
      });

      setNodes(mappedNodes);
      setLinks(data.links);
      
      // Auto zoom to fit on load
      zoomToFit(mappedNodes);

      // Auto select the highest risk node on load
      if (mappedNodes.length > 0) {
        const topRiskNode = mappedNodes.reduce((prev: any, current: any) => 
          (prev.riskScore > current.riskScore) ? prev : current
        , mappedNodes[0]);
        setSelectedNode(topRiskNode);
      }

    } catch (error) {
      console.error("Failed to load fraud network:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter nodes
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          node.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || node.status === statusFilter;
    const matchesType = typeFilter === "all" || node.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Check if a node is connected to the selected node
  const isConnected = (nodeId: string) => {
    if (!selectedNode) return false;
    if (selectedNode.id === nodeId) return true;
    return links.some(link => 
      (link.source === selectedNode.id && link.target === nodeId) ||
      (link.target === selectedNode.id && link.source === nodeId)
    );
  };

  // Node type styling helpers
  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case "bank_account": return Landmark;
      case "phone": return Phone;
      case "device": return Smartphone;
      case "ip": return Globe;
      default: return Landmark;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "mule_account":
        return {
          fill: "fill-red-600",
          stroke: "stroke-red-300",
          bg: "bg-red-50 text-red-700 border-red-200",
          badge: "bg-red-600 text-white",
          glow: "animate-ping opacity-20 bg-red-600"
        };
      case "suspicious":
        return {
          fill: "fill-amber-500",
          stroke: "stroke-amber-300",
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          badge: "bg-amber-500 text-slate-900 font-semibold",
          glow: "animate-pulse opacity-30 bg-amber-500"
        };
      default:
        return {
          fill: "fill-green-600",
          stroke: "stroke-green-300",
          bg: "bg-green-50 text-green-700 border-green-200",
          badge: "bg-green-600 text-white",
          glow: ""
        };
    }
  };

  // Stats calculation
  const totalMules = nodes.filter(n => n.status === "mule_account").length;
  const totalSuspicious = nodes.filter(n => n.status === "suspicious").length;
  const avgRisk = nodes.length ? Math.round(nodes.reduce((acc, n) => acc + n.riskScore, 0) / nodes.length) : 0;

  return (
    <div className="space-y-6">
      {/* Intro and summary statistics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Fraud Syndicate Network Explorer
          </h2>
          <p className="text-sm text-slate-500">
            Audit relational connections tracing illicit funds through shell bank accounts, burner mobile numbers, and active proxy devices.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-sync Network Data
        </button>
      </div>

      {/* Network Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="p-2 space-y-1 text-center md:text-left">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Nodes Tracked</div>
          <div className="text-xl font-extrabold text-slate-800">{nodes.length} entities</div>
        </div>
        <div className="p-2 space-y-1 text-center md:text-left border-l border-slate-100">
          <div className="text-[10px] text-red-500 uppercase tracking-wider font-semibold">Mule Accounts Flagged</div>
          <div className="text-xl font-extrabold text-red-600">{totalMules} bank nodes</div>
        </div>
        <div className="p-2 space-y-1 text-center md:text-left border-l border-slate-100">
          <div className="text-[10px] text-amber-500 uppercase tracking-wider font-semibold">Suspicious Entities</div>
          <div className="text-xl font-extrabold text-amber-600">{totalSuspicious} phones/IPs</div>
        </div>
        <div className="p-2 space-y-1 text-center md:text-left border-l border-slate-100">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Average Risk Level</div>
          <div className="text-xl font-extrabold text-indigo-600">{avgRisk}% Threat</div>
        </div>
      </div>

      {/* Control panel and filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs outline-none focus:border-indigo-500"
          >
            <option value="all">Show All Statuses</option>
            <option value="mule_account">Mule Accounts Only</option>
            <option value="suspicious">Suspicious Elements</option>
            <option value="safe">Verified Safe Entities</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Type:</span>
          <select
            value={typeFilter}
            onChange={(e: any) => setTypeFilter(e.target.value)}
            className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs outline-none focus:border-indigo-500"
          >
            <option value="all">Show All Types</option>
            <option value="bank_account">Bank Accounts</option>
            <option value="phone">Phone Numbers</option>
            <option value="device">Devices (Phones/Laptops)</option>
            <option value="ip">IP Addresses</option>
          </select>
        </div>
      </div>

      {/* Main Graph Playground and Info Board (Split Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Interactive SVG Canvas Area (7 Cols) */}
        <div className="lg:col-span-8 border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs relative flex flex-col justify-between min-h-[460px]">
          
          {/* Legend Strip */}
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Mule Account</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Suspicious</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-600" /> Safe</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <Database className="w-3 h-3" /> Sandbox Environment Model
            </div>
          </div>

          {loading ? (
            <div className="flex-grow flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <div className="text-xs font-bold uppercase tracking-wider">Syncing Relational Data</div>
            </div>
          ) : (
            <div className="flex-grow relative overflow-hidden p-4 flex items-center justify-center bg-slate-50/50 cursor-grab active:cursor-grabbing">
              {/* Floating Zoom Controls */}
              <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 bg-white border border-slate-200 p-1.5 rounded-xl shadow-md z-10">
                <button
                  onClick={() => setScale(s => Math.min(s + 0.15, 3.0))}
                  className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setScale(s => Math.max(s - 0.15, 0.4))}
                  className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => zoomToFit(nodes)}
                  className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                  title="Zoom to Fit"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>

              {/* SVG Canvas Workspace */}
              <svg 
                className="w-full max-w-[620px] aspect-[4/3] select-none outline-none"
                viewBox="0 0 600 400"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* 1. Zoomable & Pannable Group */}
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                  {/* 1. Connections Lines */}
                  <g>
                    {links.map((link, idx) => {
                      const sourceNode = nodes.find(n => n.id === link.source);
                      const targetNode = nodes.find(n => n.id === link.target);

                      if (!sourceNode || !targetNode) return null;

                      // Compute highlighting states
                      const isHighlighted = selectedNode && (selectedNode.id === link.source || selectedNode.id === link.target);
                      const isAnySelected = selectedNode !== null;
                      
                      let strokeColor = "stroke-slate-200";
                      let strokeWidth = 2;
                      let strokeDash = undefined;

                      if (isAnySelected) {
                        if (isHighlighted) {
                          strokeColor = "stroke-indigo-500";
                          strokeWidth = 3;
                        } else {
                          strokeColor = "stroke-slate-100";
                          strokeWidth = 1;
                        }
                      }

                      // Style lines depending on connection types
                      if (link.type === "network_routing") {
                        strokeDash = "3,3";
                      }

                      return (
                        <g key={idx}>
                          <line
                            x1={sourceNode.x}
                            y1={sourceNode.y}
                            x2={targetNode.x}
                            y2={targetNode.y}
                            className={`${strokeColor} transition-all duration-300`}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDash}
                          />
                          {isHighlighted && (
                            <circle
                              cx={(sourceNode.x! + targetNode.x!) / 2}
                              cy={(sourceNode.y! + targetNode.y!) / 2}
                              r="4"
                              className="fill-indigo-600 animate-bounce"
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>

                  {/* 2. Nodes Circles */}
                  <g>
                    {nodes.map((node) => {
                      const nodeX = node.x!;
                      const nodeY = node.y!;
                      const isSelected = selectedNode?.id === node.id;
                      const isDirectlyConnected = isConnected(node.id);
                      const isAnySelected = selectedNode !== null;
                      const isDimmed = isAnySelected && !isSelected && !isDirectlyConnected;
                      const meetsFilters = filteredNodes.some(n => n.id === node.id);

                      const IconComponent = getNodeTypeIcon(node.type);
                      const statusConfig = getStatusColor(node.status);

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${nodeX}, ${nodeY})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNode(node);
                          }}
                          onMouseEnter={() => setHoveredNode(node)}
                          onMouseLeave={() => setHoveredNode(null)}
                          className={`cursor-pointer transition-all duration-300 ${
                            isDimmed ? "opacity-25" : "opacity-100"
                          } ${!meetsFilters ? "opacity-10 saturate-50" : ""}`}
                        >
                          {/* Red High Risk Ping Ring */}
                          {node.status === "mule_account" && (
                            <circle
                              cx="0"
                              cy="0"
                              r="24"
                              className="fill-red-600/10 stroke-red-600/20 stroke-1 animate-pulse"
                            />
                          )}

                          {/* Interactive Circle outline */}
                          <circle
                            cx="0"
                            cy="0"
                            r={isSelected ? "18" : "15"}
                            className={`fill-white stroke-2 transition-all ${
                              isSelected 
                                ? "stroke-indigo-600 shadow-md scale-110" 
                                : node.status === "mule_account"
                                ? "stroke-red-500 hover:stroke-red-600"
                                : node.status === "suspicious"
                                ? "stroke-amber-500 hover:stroke-amber-600"
                                : "stroke-green-500 hover:stroke-green-600"
                            }`}
                          />

                          {/* Inner status dot */}
                          <circle
                            cx="11"
                            cy="-11"
                            r="5"
                            className={`${statusConfig.fill}`}
                          />

                          {/* Icon inside Node */}
                          <g transform="translate(-8, -8)">
                            <IconComponent className={`w-4 h-4 ${
                              node.status === "mule_account" ? "text-red-600" :
                              node.status === "suspicious" ? "text-amber-600" : "text-green-600"
                            }`} />
                          </g>

                          {/* Node Name/ID Tag label */}
                          <text
                            y="30"
                            textAnchor="middle"
                            className={`font-mono text-[9px] font-semibold transition-all ${
                              isSelected ? "fill-indigo-900 font-bold" : "fill-slate-500"
                            }`}
                          >
                            {node.id}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </g>
              </svg>
            </div>
          )}

          {/* User Help Advice */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 leading-relaxed text-center">
            💡 <strong>Interactive Blueprint:</strong> Hover over nodes to highlight relationships. Click any node to open forensic investigations metadata in the panel.
          </div>
        </div>

        {/* Details Side-Panel (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-xs flex-grow flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Layers className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Forensic Investigation Record</h3>
              </div>

              <AnimatePresence mode="wait">
                {selectedNode ? (
                  <motion.div
                    key={selectedNode.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    {/* Entity Title & Risk Header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-800">
                          ID: {selectedNode.id}
                        </span>
                        
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          selectedNode.status === "mule_account" ? "bg-red-100 text-red-800 border border-red-200" :
                          selectedNode.status === "suspicious" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          "bg-green-100 text-green-800 border border-green-200"
                        }`}>
                          {selectedNode.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="text-lg font-bold text-slate-900">
                        {selectedNode.label}
                      </div>
                    </div>

                    {/* Threat Risk Score Card */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between font-mono ${
                      selectedNode.riskScore >= 70 ? "bg-red-50/50 border-red-100 text-red-900" :
                      selectedNode.riskScore >= 26 ? "bg-amber-50/50 border-amber-100 text-amber-900" :
                      "bg-green-50/50 border-green-100 text-green-900"
                    }`}>
                      <div className="space-y-0.5">
                        <div className="text-[9px] uppercase tracking-wider opacity-75">Syndicate Risk Assessment</div>
                        <div className="text-sm font-black">
                          {selectedNode.riskScore >= 70 ? "🔴 CRITICAL CONCERN" :
                           selectedNode.riskScore >= 26 ? "🟡 UNDER INVESTIGATION" : "🟢 VERIFIED CLEAN"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black">{selectedNode.riskScore}%</div>
                        <div className="text-[8px] uppercase tracking-widest opacity-80">Threat Ratio</div>
                      </div>
                    </div>

                    {/* Forensic Details Fields */}
                    <div className="space-y-2.5 pt-3 border-t border-slate-100">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Forensic Metadata</div>
                      
                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs">
                        {selectedNode.bankName && (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-semibold text-[10px]">Bank Institution</span>
                            <span className="text-slate-800 font-medium">{selectedNode.bankName}</span>
                          </div>
                        )}
                        {selectedNode.location && (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-semibold text-[10px]">Assigned Region</span>
                            <span className="text-slate-800 font-medium">{selectedNode.location}</span>
                          </div>
                        )}
                        {selectedNode.lastAmount && (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-semibold text-[10px]">Last Cash Wave</span>
                            <span className="text-slate-800 font-mono font-bold text-red-600">{selectedNode.lastAmount}</span>
                          </div>
                        )}
                        {selectedNode.operator && (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-semibold text-[10px]">Telecom Operator</span>
                            <span className="text-slate-800 font-medium">{selectedNode.operator}</span>
                          </div>
                        )}
                        {selectedNode.os && (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-semibold text-[10px]">Device Firmware</span>
                            <span className="text-slate-800 font-medium">{selectedNode.os}</span>
                          </div>
                        )}
                        {selectedNode.ipAddress && (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-semibold text-[10px]">Target IPv4</span>
                            <span className="text-slate-800 font-mono font-medium">{selectedNode.ipAddress}</span>
                          </div>
                        )}
                        {selectedNode.isp && (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-semibold text-[10px]">Internet ISP</span>
                            <span className="text-slate-800 font-medium">{selectedNode.isp}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description Analysis */}
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Intelligence Briefing</div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans font-normal">
                        {selectedNode.description}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Info className="w-5 h-5 text-slate-300 mx-auto" />
                    <p className="text-xs max-w-xs mx-auto">
                      Click any node inside the syndicate map to pull active banking telemetry and phone tracing records.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Simulated Protection Action */}
            {selectedNode && selectedNode.status !== "safe" && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-red-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Direct Protection Advice
                </div>
                <p className="text-red-700 leading-relaxed font-normal">
                  This entity exhibits highly-correlated parameters matching active "Digital Arrest" money laundering syndicates. Block immediately and submit reports on cybercrime.gov.in.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
