import React, { useState, useMemo, useRef } from "react";
import {
  KanbanSquare,
  Plus,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Upload,
  Sparkles,
  ArrowRight,
  Pause,
  Play,
  FileCheck,
  Edit3,
  Save,
  X,
  Search,
  Filter,
  FileCode,
} from "lucide-react";
import { ProjectRecord, JobStatus } from "../../types";
import { downloadTextFile } from "../../services/subtitleService";

interface ProjectManagerStudioProps {
  projects: ProjectRecord[];
  onSaveProjects: (projects: ProjectRecord[]) => void;
  onNavigate: (tabId: string) => void;
}

export const ProjectManagerStudio: React.FC<ProjectManagerStudioProps> = ({
  projects,
  onSaveProjects,
  onNavigate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "proj-101");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<ProjectRecord["category"]>("Translation");
  const [formStatus, setFormStatus] = useState<JobStatus>("queued");
  const [formProgress, setFormProgress] = useState<number>(0);
  const [formCurrentStep, setFormCurrentStep] = useState("");
  const [formLogMessage, setFormLogMessage] = useState("");
  const [formNewFileName, setFormNewFileName] = useState("");
  const [formNewFileSize, setFormNewFileSize] = useState("");
  const [formNewFileType, setFormNewFileType] = useState("Manuscript Text");

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.currentStep.toLowerCase().includes(q);
      const matchesStatus = filterStatus === "all" || p.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, filterStatus]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormName("");
    setFormCategory("Translation");
    setFormCurrentStep("Initial Manuscript Intake");
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (proj: ProjectRecord) => {
    setFormName(proj.name);
    setFormCategory(proj.category);
    setFormStatus(proj.status);
    setFormProgress(proj.progressPercent);
    setFormCurrentStep(proj.currentStep);
    setFormLogMessage("");
    setShowEditModal(true);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const newProj: ProjectRecord = {
      id: `proj-${Date.now()}`,
      name: formName.trim(),
      category: formCategory,
      status: "queued",
      progressPercent: 0,
      currentStep: formCurrentStep.trim() || "Intake Initialized",
      totalSteps: 6,
      logs: [
        {
          timestamp: new Date().toLocaleTimeString(),
          level: "info",
          message: `Project "${formName.trim()}" created and queued.`,
        },
      ],
      fileManifest: [
        { name: "source_manifest.json", size: "2 KB", type: "Manifest" },
      ],
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newProj, ...projects];
    onSaveProjects(updated);
    setSelectedProjectId(newProj.id);
    setShowCreateModal(false);
    showToast(`প্রজেক্ট "${newProj.name}" তৈরি ও সংরক্ষণ করা হয়েছে।`);
  };

  const handleSaveEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const updatedLogs = [...selectedProject.logs];
    if (formLogMessage.trim()) {
      updatedLogs.push({
        timestamp: new Date().toLocaleTimeString(),
        level: "info",
        message: formLogMessage.trim(),
      });
    }

    const updated = projects.map((p) => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          name: formName.trim(),
          category: formCategory,
          status: formStatus,
          progressPercent: formProgress,
          currentStep: formCurrentStep.trim(),
          logs: updatedLogs,
          lastModified: new Date().toISOString(),
        };
      }
      return p;
    });

    onSaveProjects(updated);
    setShowEditModal(false);
    showToast(`প্রজেক্ট "${formName}" সফলভাবে আপডেট হয়েছে।`);
  };

  const handleAddFileToManifest = () => {
    if (!selectedProject || !formNewFileName.trim()) return;

    const newFile = {
      name: formNewFileName.trim(),
      size: formNewFileSize.trim() || "12 KB",
      type: formNewFileType.trim(),
    };

    const updated = projects.map((p) => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          fileManifest: [...p.fileManifest, newFile],
          logs: [
            ...p.logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              level: "success" as const,
              message: `File added to manifest: ${newFile.name} (${newFile.type})`,
            },
          ],
          lastModified: new Date().toISOString(),
        };
      }
      return p;
    });

    onSaveProjects(updated);
    setFormNewFileName("");
    setFormNewFileSize("");
    showToast(`ফাইল "${newFile.name}" ম্যানিফেস্টে যুক্ত হয়েছে।`);
  };

  const handleRemoveFileFromManifest = (fileName: string) => {
    if (!selectedProject) return;

    const updated = projects.map((p) => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          fileManifest: p.fileManifest.filter((f) => f.name !== fileName),
          logs: [
            ...p.logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              level: "warn" as const,
              message: `File removed from manifest: ${fileName}`,
            },
          ],
          lastModified: new Date().toISOString(),
        };
      }
      return p;
    });

    onSaveProjects(updated);
    showToast(`ফাইল ম্যানিফেস্ট থেকে সরানো হয়েছে।`);
  };

  const handleAddCustomLog = () => {
    if (!selectedProject || !formLogMessage.trim()) return;

    const updated = projects.map((p) => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          logs: [
            ...p.logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              level: "info" as const,
              message: formLogMessage.trim(),
            },
          ],
          lastModified: new Date().toISOString(),
        };
      }
      return p;
    });

    onSaveProjects(updated);
    setFormLogMessage("");
    showToast("নতুন লগ অডিটে যুক্ত হয়েছে।");
  };

  const handleDeleteProjectConfirmed = () => {
    if (!projectToDelete) return;
    const updated = projects.filter((p) => p.id !== projectToDelete.id);
    onSaveProjects(updated);
    if (selectedProjectId === projectToDelete.id && updated.length > 0) {
      setSelectedProjectId(updated[0].id);
    }
    showToast(`প্রজেক্ট "${projectToDelete.name}" মোছা হয়েছে।`);
    setProjectToDelete(null);
  };

  const handleExportProjectArchive = (proj: ProjectRecord) => {
    downloadTextFile(
      JSON.stringify(proj, null, 2),
      `${proj.name.replace(/\s+/g, "_")}_project_manifest.json`,
      "application/json"
    );
    showToast("প্রজেক্টের JSON ম্যানিফেস্ট ডাউনলোড শুরু হয়েছে।");
  };

  const handleExportAllProjects = () => {
    const payload = {
      archive: "NBM Audio & Book Studio Project Pipeline",
      totalProjects: projects.length,
      exportedAt: new Date().toISOString(),
      projects,
    };
    downloadTextFile(
      JSON.stringify(payload, null, 2),
      `nbm_all_projects_manifest_${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
    showToast("সকল প্রজেক্টের একত্রিত JSON ব্যাকআপ ডাউনলোড হয়েছে।");
  };

  const handleImportProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        let importedList: ProjectRecord[] = [];

        if (Array.isArray(parsed)) {
          importedList = parsed;
        } else if (parsed.projects && Array.isArray(parsed.projects)) {
          importedList = parsed.projects;
        } else if (parsed.name && parsed.category) {
          importedList = [parsed as ProjectRecord];
        }

        if (importedList.length === 0) {
          showToast("ত্রুটি: ফাইলে কোনো বৈধ প্রজেক্টের তথ্য নেই।");
          return;
        }

        const existingIds = new Set(projects.map((p) => p.id));
        const clean = importedList.map((p, i) => ({
          ...p,
          id: existingIds.has(p.id) ? `proj-imp-${Date.now()}-${i}` : p.id || `proj-${Date.now()}-${i}`,
          logs: p.logs || [],
          fileManifest: p.fileManifest || [],
          lastModified: new Date().toISOString(),
        }));

        const merged = [...clean, ...projects];
        onSaveProjects(merged);
        setSelectedProjectId(clean[0].id);
        showToast(`${clean.length}টি প্রজেক্ট সফলভাবে ইমপোর্ট হয়েছে।`);
      } catch (err) {
        showToast("ত্রুটি: ফাইলটি সঠিক JSON ফরম্যাটে নেই।");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const statusBadge = (st: JobStatus) => {
    const styles: Record<JobStatus, string> = {
      completed: "text-[#50B876] bg-[#50B876]/10 border-[#50B876]/30",
      review_required: "text-[#D49842] bg-[#D49842]/10 border-[#D49842]/30",
      processing: "text-[#6292E6] bg-[#6292E6]/10 border-[#6292E6]/30",
      failed: "text-[#E66262] bg-[#E66262]/10 border-[#E66262]/30",
      queued: "text-[#A8B4C7] bg-[#1B212D] border-[#2A3447]",
      draft: "text-[#8F9CAE] bg-[#181D26] border-[#252E3E]",
      paused: "text-[#D4A373] bg-[#D4A373]/10 border-[#D4A373]/30",
      cancelled: "text-[#888888] bg-[#222222] border-[#444444]",
    };
    return (
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${styles[st] || ""}`}>
        {st.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed top-20 right-6 z-50 bg-[#17211B] border border-[#2D5A3F] text-[#71E69C] px-4 py-3 rounded-md shadow-2xl flex items-center gap-2 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#50B876] shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <KanbanSquare className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Pipeline State Machine & Job Queue</span>
            <span aria-hidden="true">·</span>
            <span>Non-Volatile Step Tracking</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">Project Manager</h1>
          <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
            প্রজেক্ট তৈরি, স্ট্যাটাস আপডেট, অগ্রগতি ট্র্যাকিং, ফাইল ম্যানিফেস্ট এবং JSON ইমপোর্ট ও এক্সপোর্ট।
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Project (নতুন প্রজেক্ট)</span>
          </button>

          <label className="px-3 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#2A3447] text-xs font-medium rounded flex items-center gap-1.5 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-[#B88746]" />
            <span>Import Project JSON</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportProjectJson}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportAllProjects}
            className="px-3 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#2A3447] text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#B88746]" />
            <span>Export All Projects</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#637085] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects by name, category, or current step..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D0F14] border border-[#232B3B] rounded pl-9 pr-4 py-2 text-xs text-[#EDE8DE] placeholder-[#5A6578] focus:border-[#B88746] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            {["all", "completed", "processing", "review_required", "queued", "paused", "failed"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded capitalize whitespace-nowrap transition-colors ${
                  filterStatus === st
                    ? "bg-[#B88746] text-[#0D0F12] font-semibold"
                    : "bg-[#0D0F14] text-[#8692A6] hover:text-[#EDE8DE]"
                }`}
              >
                {st === "all" ? "All Status" : st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#7F8D9E] pt-1">
          <span>Showing {filteredProjects.length} of {projects.length} projects</span>
          <span>Automatic persistence in browser storage</span>
        </div>
      </div>

      {/* Main Grid: Projects Queue on Left, Active Project Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Projects List */}
        <div className="lg:col-span-7 space-y-3">
          {filteredProjects.map((proj) => {
            const isSelected = selectedProject?.id === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className={`p-4 rounded-md border text-xs cursor-pointer transition-all space-y-3 ${
                  isSelected
                    ? "bg-[#161B24] border-[#B88746] shadow-md shadow-[#B88746]/5"
                    : "bg-[#12151C] border-[#202735] hover:border-[#2E394C]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-[#EDE8DE] truncate">{proj.name}</span>
                    {statusBadge(proj.status)}
                  </div>
                  <span className="font-mono text-[#7F8D9E] text-[11px]">{proj.progressPercent}%</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#7E8B9E]">
                  <span className="text-[#A8B4C7]">{proj.category}</span>
                  <span className="truncate max-w-xs">{proj.currentStep}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#0E1015] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#B88746] h-full transition-all duration-300"
                    style={{ width: `${proj.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#647185] pt-1">
                  <span>{proj.fileManifest.length} files in manifest</span>
                  <span>Modified: {new Date(proj.lastModified).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Project Details, Manifest & Logs */}
        <div className="lg:col-span-5">
          {selectedProject ? (
            <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md space-y-5 sticky top-20 manuscript-paper text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#B88746] uppercase tracking-wider">
                    Project Pipeline Dossier
                  </span>
                  {statusBadge(selectedProject.status)}
                </div>
                <h3 className="text-base font-bold text-[#F4EFE6] font-display">{selectedProject.name}</h3>
                <div className="text-[11px] text-[#7F8D9E] font-mono">
                  Category: {selectedProject.category} · Step: {selectedProject.currentStep}
                </div>
              </div>

              {/* Action Buttons: Edit, Export, Delete */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-[#1E2535] pb-3">
                <button
                  onClick={() => handleOpenEditModal(selectedProject)}
                  className="px-3 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] font-semibold rounded flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Project (সম্পাদনা)</span>
                </button>

                <button
                  onClick={() => handleExportProjectArchive(selectedProject)}
                  className="px-3 py-1.5 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#283244] rounded flex items-center gap-1.5 transition-colors"
                  title="Export this project manifest as JSON"
                >
                  <Download className="w-3.5 h-3.5 text-[#B88746]" />
                  <span>Export Manifest</span>
                </button>

                <button
                  onClick={() => setProjectToDelete(selectedProject)}
                  className="p-1.5 bg-[#181D26] hover:bg-[#2C1818] text-[#7F8D9E] hover:text-[#E66262] rounded border border-[#283244] transition-colors ml-auto"
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* File Manifest Section with Add/Remove */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#EDE8DE]">
                    File Manifest ({selectedProject.fileManifest.length}):
                  </span>
                </div>

                <div className="space-y-1.5 bg-[#0E1015] p-3 rounded border border-[#1E2535] max-h-36 overflow-y-auto">
                  {selectedProject.fileManifest.map((f, i) => (
                    <div key={i} className="flex items-center justify-between font-mono text-[11px] py-0.5">
                      <div className="truncate max-w-[200px]">
                        <span className="text-[#C9BFAD]">{f.name}</span>
                        <span className="text-[#647185] ml-2">({f.type})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#647185]">{f.size}</span>
                        <button
                          onClick={() => handleRemoveFileFromManifest(f.name)}
                          className="text-[#647185] hover:text-[#E66262]"
                          title="Remove file"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedProject.fileManifest.length === 0 && (
                    <div className="text-[#647185] italic text-[11px]">No files listed in manifest yet.</div>
                  )}
                </div>

                {/* Add file inline */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="File name (e.g. audio_master.wav)"
                    value={formNewFileName}
                    onChange={(e) => setFormNewFileName(e.target.value)}
                    className="flex-1 bg-[#0D0F14] border border-[#232B3B] rounded px-2.5 py-1 text-[11px] text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Size (e.g. 24 MB)"
                    value={formNewFileSize}
                    onChange={(e) => setFormNewFileSize(e.target.value)}
                    className="w-24 bg-[#0D0F14] border border-[#232B3B] rounded px-2.5 py-1 text-[11px] text-[#EDE8DE] focus:border-[#B88746] focus:outline-none font-mono"
                  />
                  <button
                    onClick={handleAddFileToManifest}
                    disabled={!formNewFileName.trim()}
                    className="px-2.5 py-1 bg-[#181D26] hover:bg-[#222938] disabled:opacity-40 text-[#D8CFBF] rounded border border-[#283244] text-[11px]"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Execution Audit Trail & Custom Log */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#EDE8DE]">Execution Log & Audit Trail:</span>
                  <span className="text-[10px] text-[#647185]">{selectedProject.logs.length} entries</span>
                </div>

                <div className="bg-[#0A0C10] border border-[#1A202B] rounded p-3 space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
                  {selectedProject.logs.map((l, i) => {
                    const color =
                      l.level === "success"
                        ? "text-[#50B876]"
                        : l.level === "warn"
                        ? "text-[#D49842]"
                        : l.level === "error"
                        ? "text-[#E66262]"
                        : "text-[#8E9CB0]";
                    return (
                      <div key={i} className="leading-relaxed">
                        <span className="text-[#515E74]">[{l.timestamp}]</span>{" "}
                        <span className={color}>{l.message}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Log */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add audit note to project log..."
                    value={formLogMessage}
                    onChange={(e) => setFormLogMessage(e.target.value)}
                    className="flex-1 bg-[#0D0F14] border border-[#232B3B] rounded px-2.5 py-1 text-[11px] text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                  <button
                    onClick={handleAddCustomLog}
                    disabled={!formLogMessage.trim()}
                    className="px-3 py-1 bg-[#181D26] hover:bg-[#222938] disabled:opacity-40 text-[#D8CFBF] rounded border border-[#283244] text-[11px]"
                  >
                    Log
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-[#202735] rounded text-center text-[#7F8D9E]">
              Select a project from the left to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151C] border border-[#252E3E] rounded-md max-w-md w-full p-6 space-y-4 text-xs manuscript-paper">
            <div className="flex items-center justify-between border-b border-[#222B3B] pb-3">
              <h3 className="text-base font-bold text-[#F4EFE6] font-display">Create Literary Studio Project</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#7F8D9E] hover:text-[#EDE8DE]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-[#8F9AA9] mb-1">Project Name: *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gitanjali Bengali-English Audio Manuscript"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8F9AA9] mb-1">Pipeline Category:</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                >
                  <option value="World Literature">World Literature</option>
                  <option value="OCR & Digitization">OCR & Digitization</option>
                  <option value="Translation">Translation</option>
                  <option value="Audiobook Production">Audiobook Production</option>
                  <option value="Multimedia Video">Multimedia Video</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8F9AA9] mb-1">Initial Step Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Archival Manuscript Extraction"
                  value={formCurrentStep}
                  onChange={(e) => setFormCurrentStep(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-[#181D26] hover:bg-[#222938] text-[#8F9AA9] rounded border border-[#273042]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] font-semibold rounded"
                >
                  Create & Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151C] border border-[#252E3E] rounded-md max-w-lg w-full p-6 space-y-4 text-xs manuscript-paper">
            <div className="flex items-center justify-between border-b border-[#222B3B] pb-3">
              <h3 className="text-base font-bold text-[#F4EFE6] font-display">Edit Project Details (প্রজেক্ট সম্পাদনা)</h3>
              <button onClick={() => setShowEditModal(false)} className="text-[#7F8D9E] hover:text-[#EDE8DE]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProject} className="space-y-4">
              <div>
                <label className="block text-[#8F9AA9] mb-1">Project Name:</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8F9AA9] mb-1">Pipeline Status:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as JobStatus)}
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none capitalize"
                  >
                    <option value="draft">Draft</option>
                    <option value="queued">Queued</option>
                    <option value="processing">Processing</option>
                    <option value="review_required">Review Required</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8F9AA9] mb-1">Category:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  >
                    <option value="World Literature">World Literature</option>
                    <option value="OCR & Digitization">OCR & Digitization</option>
                    <option value="Translation">Translation</option>
                    <option value="Audiobook Production">Audiobook Production</option>
                    <option value="Multimedia Video">Multimedia Video</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#8F9AA9]">Progress Percentage:</label>
                  <span className="font-mono text-[#B88746]">{formProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formProgress}
                  onChange={(e) => setFormProgress(parseInt(e.target.value, 10))}
                  className="w-full accent-[#B88746]"
                />
              </div>

              <div>
                <label className="block text-[#8F9AA9] mb-1">Current Active Step:</label>
                <input
                  type="text"
                  value={formCurrentStep}
                  onChange={(e) => setFormCurrentStep(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8F9AA9] mb-1">Add Note / Log Message:</label>
                <input
                  type="text"
                  placeholder="e.g. Verified chapter audio loudness (-16 LUFS)"
                  value={formLogMessage}
                  onChange={(e) => setFormLogMessage(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 bg-[#181D26] hover:bg-[#222938] text-[#8F9AA9] rounded border border-[#273042]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] font-semibold rounded flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181D24] border border-[#3C2424] rounded-md max-w-sm w-full p-6 space-y-4 text-xs manuscript-paper">
            <div className="flex items-center gap-2 text-[#E66262]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-[#F4EFE6]">প্রজেক্ট মোছার নিশ্চিতকরণ</h3>
            </div>
            <p className="text-[#C9BFAD] leading-relaxed">
              আপনি কি নিশ্চিত যে <span className="font-semibold text-[#EDE8DE]">"{projectToDelete.name}"</span> প্রজেক্টটি মুছে ফেলতে চান?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-3 py-1.5 bg-[#202732] hover:bg-[#2A3444] text-[#EDE8DE] rounded border border-[#2F3A4C]"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleDeleteProjectConfirmed}
                className="px-3 py-1.5 bg-[#E66262] hover:bg-[#F27272] text-white font-semibold rounded"
              >
                মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
