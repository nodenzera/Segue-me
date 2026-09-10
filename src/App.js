import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  LogIn,
  Database,
  Settings,
  AlertTriangle,
  ArrowRight,
  X,
  Search,
  Download,
  Plus,
  RefreshCw,
  ArrowLeftRight,
  Trash2,
  Edit3,
  CheckCircle,
  Info,
  Upload,
  Check,
  UserCircle2,
  UserCog,
  Calendar,
} from "lucide-react";

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";

// Suas chaves oficias do Banco de Dados
const firebaseConfig = {
  apiKey: "AIzaSyBu382qTm_fzbCHiyLMeYJsIEVpeD8ICf4",
  authDomain: "bd-segue-me.firebaseapp.com",
  projectId: "bd-segue-me",
  storageBucket: "bd-segue-me.firebasestorage.app",
  messagingSenderId: "679316272190",
  appId: "1:679316272190:web:fd617dc80990dd786fcd6f",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Facilitadores de caminho do banco
const getCollection = (name) =>
  collection(db, "artifacts", "segueme", "public", "data", name);
const getDocRef = (name, id) =>
  doc(db, "artifacts", "segueme", "public", "data", name, id);

const CrossIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2v20M7 8h10" />
  </svg>
);

const EQUIPES_OFICIAIS = [
  { name: "Diretor Espiritual", vagas: 1 },
  { name: "Comandantes", vagas: 4 },
  { name: "Equipe Espiritualizadora", vagas: 4 },
  { name: "Equipe da Animação", vagas: 16 },
  { name: "Equipe do Canto", vagas: 12 },
  { name: "Equipe dos Círculos", vagas: 26 },
  { name: "Equipe da Cozinha", vagas: 16 },
  { name: "Equipe do Estacionamento", vagas: 12 },
  { name: "Equipe da Faxina", vagas: 14 },
  { name: "Equipe da Gráfica", vagas: 12 },
  { name: "Equipe do Lanche", vagas: 12 },
  { name: "Equipe da Liturgia e Vigília", vagas: 18 },
  { name: "Equipe do Minimercado", vagas: 8 },
  { name: "Equipe do Prover", vagas: 4 },
  { name: "Equipe da Sala", vagas: 16 },
  { name: "Equipe da Vigília Paroquial", vagas: 16 },
  { name: "Equipe da Visitação", vagas: 42 },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

const CORES_MAPEADAS = {
  amarelo: "bg-yellow-400",
  azul: "bg-blue-500",
  vermelho: "bg-red-500",
  verde: "bg-green-500",
  laranja: "bg-orange-500",
  roxo: "bg-purple-500",
  rosa: "bg-pink-400",
  branco: "bg-slate-100 border border-slate-300",
  preto: "bg-slate-800",
};

const getCorBadge = (corNome) => {
  if (!corNome) return "bg-slate-200";
  const c = corNome.toLowerCase().trim();
  for (const key in CORES_MAPEADAS) {
    if (c.includes(key)) return CORES_MAPEADAS[key];
  }
  return "bg-indigo-400";
};

// COMPRESSOR DE IMAGENS - Encolhe a foto e transforma em texto antes de salvar
const handleImageUpload = (file) => {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === "error" ? "bg-red-600" : "bg-emerald-600";

  return (
    <div
      className={`fixed bottom-4 right-4 ${bg} text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce z-50`}
    >
      {type === "error" ? (
        <AlertTriangle className="w-5 h-5" />
      ) : (
        <CheckCircle className="w-5 h-5" />
      )}
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default function SegueMeApp() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [isAnoModalOpen, setIsAnoModalOpen] = useState(false);
  const [novoAnoNome, setNovoAnoNome] = useState("");

  // Database States vindos do Firebase
  const [bancoGeral, setBancoGeral] = useState([]);
  const [anos, setAnos] = useState([]);
  const [currentAnoId, setCurrentAnoId] = useState(null);
  const [equipesAno, setEquipesAno] = useState([]);
  const [membrosEquipe, setMembrosEquipe] = useState([]);
  const [circulos, setCirculos] = useState([]);

  // Monitora Login e Logout
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Monitora o Banco de Dados em Tempo Real (Apenas se estiver logado)
  useEffect(() => {
    if (!user) {
      setBancoGeral([]);
      setAnos([]);
      setEquipesAno([]);
      setMembrosEquipe([]);
      setCirculos([]);
      return;
    }

    const unsubBanco = onSnapshot(
      getCollection("bancoGeral"),
      (snap) => setBancoGeral(snap.docs.map((d) => d.data())),
      console.error
    );
    const unsubAnos = onSnapshot(
      getCollection("anos"),
      (snap) => {
        const anosData = snap.docs.map((d) => d.data());
        setAnos(anosData);
        if (anosData.length > 0 && !currentAnoId)
          setCurrentAnoId(anosData[0].id);
      },
      console.error
    );
    const unsubEquipes = onSnapshot(
      getCollection("equipesAno"),
      (snap) => setEquipesAno(snap.docs.map((d) => d.data())),
      console.error
    );
    const unsubMembros = onSnapshot(
      getCollection("membrosEquipe"),
      (snap) => setMembrosEquipe(snap.docs.map((d) => d.data())),
      console.error
    );
    const unsubCirculos = onSnapshot(
      getCollection("circulos"),
      (snap) => setCirculos(snap.docs.map((d) => d.data())),
      console.error
    );

    return () => {
      unsubBanco();
      unsubAnos();
      unsubEquipes();
      unsubMembros();
      unsubCirculos();
    };
  }, [user]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      showToast("Acesso negado! Verifique e-mail e senha.", "error");
    }
  };

  if (authLoading)
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <CrossIcon className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">
            Sistema Segue-me
          </h1>
          <p className="text-slate-500 mb-8 font-medium">
            Acesso Seguro em Nuvem
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="E-mail de acesso"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
              required
            />
            <input
              type="password"
              placeholder="Senha de Acesso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
              required
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 mt-4 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" /> Entrar no Sistema
            </button>
          </form>
        </div>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  const handleCreateAno = async (name) => {
    const newAno = { id: generateId(), name, data: new Date().toISOString() };
    await setDoc(getDocRef("anos", newAno.id), newAno);
    setCurrentAnoId(newAno.id);

    // Auto-cria equipes no Banco
    const batch = writeBatch(db);
    EQUIPES_OFICIAIS.forEach((eq) => {
      const id = generateId();
      batch.set(getDocRef("equipesAno", id), {
        id,
        anoId: newAno.id,
        name: eq.name,
        vagas: eq.vagas,
      });
    });
    await batch.commit();
    showToast(`Edição ${name} criada com equipes oficiais!`);
  };

  const currentAno = anos.find((a) => a.id === currentAnoId);
  const currentEquipes = equipesAno.filter((e) => e.anoId === currentAnoId);
  const currentCirculos = circulos.filter((c) => c.anoId === currentAnoId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <div className="w-full md:w-72 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 text-white mb-6">
            <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20">
              <CrossIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight drop-shadow-md">
              Segue-me
            </h1>
          </div>

          <div className="mb-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Edição Atual
            </label>
            {anos.length === 0 ? (
              <button
                onClick={() => setIsAnoModalOpen(true)}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500 transition shadow-md"
              >
                + Criar 1ª Edição
              </button>
            ) : (
              <select
                value={currentAnoId || ""}
                onChange={(e) => setCurrentAnoId(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg px-3 py-2.5 text-sm border border-slate-700 outline-none focus:border-indigo-500 font-bold"
              >
                {anos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {anos.length > 0 && (
            <button
              onClick={() => setIsAnoModalOpen(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold w-full text-left mt-2 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Nova edição
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: "dashboard", icon: Calendar, label: "Visão Geral" },
            { id: "equipes", icon: Users, label: "Equipes de Trabalho" },
            { id: "circulos", icon: UserPlus, label: "Círculos (Seguimistas)" },
            { id: "bd", icon: Database, label: "Banco de Dados Geral" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === item.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-red-500 rounded-xl text-sm font-bold px-4 py-3 transition"
          >
            <LogIn className="w-4 h-4 rotate-180" /> Sair do Sistema
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto h-screen relative">
        {!currentAnoId && anos.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <div className="max-w-md">
              <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <CrossIcon className="w-12 h-12 text-slate-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                Bem-vindo ao Segue-me!
              </h2>
              <p className="text-slate-500 mb-6">
                Para começar a organizar as equipes e círculos, crie a primeira
                edição do retiro.
              </p>
              <button
                onClick={() => setIsAnoModalOpen(true)}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
              >
                Criar Nova Edição
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-10 max-w-7xl mx-auto">
            {activeTab === "dashboard" && (
              <DashboardView
                currentAno={currentAno}
                currentEquipes={currentEquipes}
                membros={membrosEquipe}
                circulos={currentCirculos}
                bancoGeral={bancoGeral}
              />
            )}
            {activeTab === "equipes" && (
              <EquipesView
                currentEquipes={currentEquipes}
                membrosEquipe={membrosEquipe}
                bancoGeral={bancoGeral}
                circulos={currentCirculos}
                currentAno={currentAno}
                showToast={showToast}
              />
            )}
            {activeTab === "circulos" && (
              <CirculosView
                currentCirculos={currentCirculos}
                currentAno={currentAno}
                bancoGeral={bancoGeral}
                showToast={showToast}
              />
            )}
            {activeTab === "bd" && (
              <BancoGeralView bancoGeral={bancoGeral} showToast={showToast} />
            )}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modal de Nova Edição */}
      {isAnoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500"></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <CrossIcon className="w-5 h-5 text-indigo-500" /> Nova Edição
              </h3>
              <button
                onClick={() => setIsAnoModalOpen(false)}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (novoAnoNome.trim()) {
                  handleCreateAno(novoAnoNome);
                  setIsAnoModalOpen(false);
                  setNovoAnoNome("");
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Nome da Edição (Ex: Segue-me 2026)
                </label>
                <input
                  type="text"
                  required
                  value={novoAnoNome}
                  onChange={(e) => setNovoAnoNome(e.target.value)}
                  className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold mt-6 shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> Criar e Configurar Equipes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardView({
  currentAno,
  currentEquipes,
  membros,
  circulos,
  bancoGeral,
}) {
  const stats = [
    {
      label: "Total no BD",
      value: bancoGeral.length,
      icon: Database,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Trabalhando (" + currentAno?.name + ")",
      value: membros.filter((m) =>
        currentEquipes.some((e) => e.id === m.equipeId)
      ).length,
      icon: UserCog,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Círculos Criados",
      value: circulos.length,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      label: "Jovens (BD)",
      value: bancoGeral.filter((b) => b.tipo === "Jovem").length,
      icon: UserCircle2,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-800">
          Visão Geral - {currentAno?.name}
        </h2>
        <p className="text-slate-500">Resumo da organização em tempo real.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((s, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition"
          >
            <div className={`p-4 rounded-xl ${s.bg} ${s.color}`}>
              <s.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {s.label}
              </p>
              <p className="text-3xl font-black text-slate-700">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BancoGeralView({ bancoGeral, showToast }) {
  const [filterTipo, setFilterTipo] = useState("Jovem");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [editingPerson, setEditingPerson] = useState(null);

  const baixarPlanilha = () => {
    let csv = "Nome,Categoria,Sexo,Telefone,Paroquia,Historico\n";
    bancoGeral.forEach((p) => {
      const hist = p.history
        ? p.history.map((h) => `${h.equipe} (${h.ano})`).join(" | ")
        : "";
      csv += `${p.name},${p.tipo},${p.sexo},${p.telefone},${p.paroquia},"${hist}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `Banco_Seguidores_${new Date().getFullYear()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = bancoGeral
    .filter((b) => b.tipo === filterTipo)
    .filter(
      (b) =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.paroquia?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    await setDoc(getDocRef("bancoGeral", editingPerson.id), editingPerson);
    setEditingPerson(null);
    showToast("Dados atualizados na nuvem!");
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Banco de Dados</h2>
          <p className="text-slate-500">
            Controle histórico de todos os Seguidores.
          </p>
        </div>
        <button
          onClick={baixarPlanilha}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-md"
        >
          <Download className="w-4 h-4" /> Exportar Planilha
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setFilterTipo("Jovem")}
            className={`flex-1 py-4 font-bold text-sm transition ${
              filterTipo === "Jovem"
                ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Jovens
          </button>
          <button
            onClick={() => setFilterTipo("Adulto")}
            className={`flex-1 py-4 font-bold text-sm transition ${
              filterTipo === "Adulto"
                ? "bg-amber-50 text-amber-700 border-b-2 border-amber-600"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Tios / Tias (Adultos)
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou paróquia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            />
          </div>
        </div>

        {/* Listagem */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <th className="p-4">Nome Completo</th>
                <th className="p-4">Paróquia</th>
                <th className="p-4">Contato</th>
                <th className="p-4">Histórico</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-8 text-center text-slate-400 font-medium"
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredData.map((person) => (
                  <tr
                    key={person.id}
                    className="hover:bg-slate-50 transition group"
                  >
                    <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black text-xs overflow-hidden shrink-0">
                        {person.foto ? (
                          <img
                            src={person.foto}
                            alt="Foto"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          person.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {person.name}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {person.paroquia || "-"}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {person.telefone || "-"}
                    </td>
                    <td className="p-4 text-sm text-slate-600 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {person.history?.length > 0 ? (
                          person.history.map((h, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] rounded-md font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] inline-block"
                              title={`${h.equipe} - ${h.ano}`}
                            >
                              {h.equipe}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-xs">
                            Sem histórico
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() =>
                          setEditingPerson(JSON.parse(JSON.stringify(person)))
                        }
                        className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-lg transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição */}
      {editingPerson && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">
                Editar Membro
              </h3>
              <button
                onClick={() => setEditingPerson(null)}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Foto de Perfil
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files[0]) {
                      const base64 = await handleImageUpload(e.target.files[0]);
                      setEditingPerson({ ...editingPerson, foto: base64 });
                    }
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                />
                {editingPerson.foto && (
                  <img
                    src={editingPerson.foto}
                    alt="Preview"
                    className="w-12 h-12 mt-2 rounded-full object-cover border border-slate-200 shadow-sm"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={editingPerson.name}
                  onChange={(e) =>
                    setEditingPerson({ ...editingPerson, name: e.target.value })
                  }
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">
                    Categoria
                  </label>
                  <select
                    value={editingPerson.tipo}
                    onChange={(e) =>
                      setEditingPerson({
                        ...editingPerson,
                        tipo: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="Jovem">Jovem</option>
                    <option value="Adulto">Adulto (Tio/Tia)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">
                    Sexo
                  </label>
                  <select
                    value={editingPerson.sexo || "M"}
                    onChange={(e) =>
                      setEditingPerson({
                        ...editingPerson,
                        sexo: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">
                  Telefone
                </label>
                <input
                  type="text"
                  value={editingPerson.telefone || ""}
                  onChange={(e) =>
                    setEditingPerson({
                      ...editingPerson,
                      telefone: e.target.value,
                    })
                  }
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">
                  Paróquia
                </label>
                <input
                  type="text"
                  value={editingPerson.paroquia || ""}
                  onChange={(e) =>
                    setEditingPerson({
                      ...editingPerson,
                      paroquia: e.target.value,
                    })
                  }
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold mt-6 shadow-md hover:bg-indigo-700 transition"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CirculosView({ currentCirculos, currentAno, bancoGeral, showToast }) {
  const [isAddingCirculo, setIsAddingCirculo] = useState(false);

  const handleSaveCirculo = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const novoCirculo = {
      id: generateId(),
      anoId: currentAno.id,
      cor: data.get("cor"),
      tioId: data.get("tioId") || null,
      tiaId: data.get("tiaId") || null,
      apoioId: data.get("apoioId") || null,
      membros: [],
    };

    const inAnotherCirculo = currentCirculos.some(
      (c) =>
        (novoCirculo.tioId && c.tioId === novoCirculo.tioId) ||
        (novoCirculo.tiaId && c.tiaId === novoCirculo.tiaId) ||
        (novoCirculo.apoioId && c.apoioId === novoCirculo.apoioId)
    );

    if (inAnotherCirculo) {
      showToast(
        "Aviso: Um dos responsáveis já está em outro círculo.",
        "error"
      );
      return;
    }

    await setDoc(getDocRef("circulos", novoCirculo.id), novoCirculo);
    setIsAddingCirculo(false);
    showToast("Círculo sincronizado na nuvem!");
  };

  const handleUpdateCirculo = async (id, field, value) => {
    const circulo = currentCirculos.find((c) => c.id === id);
    if (circulo)
      await setDoc(getDocRef("circulos", id), { ...circulo, [field]: value });
  };

  const handleAddSeguimista = async (circuloId, e) => {
    e.preventDefault();
    const form = e.target;

    let fotoBase64 = null;
    if (form.foto.files && form.foto.files[0]) {
      fotoBase64 = await handleImageUpload(form.foto.files[0]);
    }

    const novoSeguimista = {
      id: generateId(),
      nome: form.nome.value,
      paroquia: form.paroquia.value,
      telefone: form.telefone.value,
      sexo: form.sexo.value,
      foto: fotoBase64,
    };

    // Atualiza o círculo no DB
    const circulo = currentCirculos.find((c) => c.id === circuloId);
    await setDoc(getDocRef("circulos", circuloId), {
      ...circulo,
      membros: [...circulo.membros, novoSeguimista],
    });

    // Salva no Banco Geral
    const dbPerson = {
      id: generateId(),
      name: novoSeguimista.nome,
      paroquia: novoSeguimista.paroquia,
      telefone: novoSeguimista.telefone,
      sexo: novoSeguimista.sexo,
      tipo: "Jovem",
      foto: fotoBase64,
      history: [{ ano: currentAno.name, equipe: "Fez o Retiro (Seguimista)" }],
    };
    await setDoc(getDocRef("bancoGeral", dbPerson.id), dbPerson);

    form.reset();
    showToast("Jovem adicionado e salvo no Banco Geral!");
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800">
            Círculos de Seguimistas
          </h2>
          <p className="text-slate-500">
            Organize os círculos do {currentAno?.name}.
          </p>
        </div>
        <button
          onClick={() => setIsAddingCirculo(true)}
          className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md"
        >
          <Plus className="w-5 h-5" /> Novo Círculo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentCirculos.map((circulo) => {
          const colorClass = getCorBadge(circulo.cor);
          return (
            <div
              key={circulo.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
            >
              <div
                className={`p-4 ${colorClass} text-white flex justify-between items-center`}
              >
                <h3 className="font-black text-lg capitalize drop-shadow-md">
                  Círculo {circulo.cor}
                </h3>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                  {circulo.membros?.length || 0} Jovens
                </span>
              </div>

              <div className="p-5 bg-slate-50 border-b border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-sm">
                    <span className="block text-[10px] text-slate-400 font-bold">
                      TIO (Adulto)
                    </span>
                    <select
                      value={circulo.tioId || ""}
                      onChange={(e) =>
                        handleUpdateCirculo(circulo.id, "tioId", e.target.value)
                      }
                      className="w-full bg-transparent font-medium outline-none"
                    >
                      <option value="">-- Selecionar --</option>
                      {bancoGeral
                        .filter((b) => b.tipo === "Adulto" && b.sexo !== "F")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-sm">
                    <span className="block text-[10px] text-slate-400 font-bold">
                      TIA (Adulto)
                    </span>
                    <select
                      value={circulo.tiaId || ""}
                      onChange={(e) =>
                        handleUpdateCirculo(circulo.id, "tiaId", e.target.value)
                      }
                      className="w-full bg-transparent font-medium outline-none"
                    >
                      <option value="">-- Selecionar --</option>
                      {bancoGeral
                        .filter((b) => b.tipo === "Adulto" && b.sexo === "F")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-sm">
                    <span className="block text-[10px] text-slate-400 font-bold">
                      JOVEM APOIO
                    </span>
                    <select
                      value={circulo.apoioId || ""}
                      onChange={(e) =>
                        handleUpdateCirculo(
                          circulo.id,
                          "apoioId",
                          e.target.value
                        )
                      }
                      className="w-full bg-transparent font-medium outline-none"
                    >
                      <option value="">-- Selecionar --</option>
                      {bancoGeral
                        .filter((b) => b.tipo === "Jovem")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Seguimistas (Jovens)
                </h4>
                <ul className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2">
                  {circulo.membros?.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg text-sm border border-slate-100"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black text-[10px] overflow-hidden shrink-0">
                        {m.foto ? (
                          <img
                            src={m.foto}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          m.nome.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="font-bold text-slate-700">
                          {m.nome}
                        </span>
                        <span className="text-xs text-slate-500">
                          {m.paroquia}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                <form
                  onSubmit={(e) => handleAddSeguimista(circulo.id, e)}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="nome"
                      placeholder="Nome do Jovem"
                      required
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 outline-none"
                    />
                    <select
                      name="sexo"
                      className="w-24 px-2 py-1.5 text-sm rounded-lg border border-slate-200 outline-none"
                    >
                      <option value="M">Rapaz</option>
                      <option value="F">Moça</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      name="foto"
                      accept="image/*"
                      title="Foto do Jovem"
                      className="w-full px-2 py-1 text-[10px] text-slate-500 rounded-lg border border-slate-200 outline-none bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="paroquia"
                      placeholder="Paróquia"
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 outline-none"
                    />
                    <input
                      type="text"
                      name="telefone"
                      placeholder="Telefone"
                      className="w-32 px-3 py-1.5 text-sm rounded-lg border border-slate-200 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition"
                  >
                    + Adicionar e Salvar
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      {isAddingCirculo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">
                Novo Círculo
              </h3>
              <button
                onClick={() => setIsAddingCirculo(false)}
                className="p-2 bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCirculo} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">
                  Cor do Círculo
                </label>
                <input
                  type="text"
                  name="cor"
                  required
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold capitalize"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold mt-6 shadow-md hover:bg-indigo-700"
              >
                Criar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EquipesView({
  currentEquipes,
  membrosEquipe,
  bancoGeral,
  circulos,
  currentAno,
  showToast,
}) {
  const [selectedEquipe, setSelectedEquipe] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [transferModal, setTransferModal] = useState({
    open: false,
    membro: null,
  });

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const normalizeStr = (str) => {
      if (!str) return "";
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    };

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result.replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length < 2) return showToast("Planilha inválida", "error");

      const cleanLines = lines.map((line) => {
        let l = line.trim();
        if (l.startsWith('"') && l.endsWith('"') && !l.includes('","'))
          return l.substring(1, l.length - 1);
        return l;
      });

      let delimiter = ",";
      if (cleanLines[0].includes(";")) delimiter = ";";
      else if (cleanLines[0].includes("\t")) delimiter = "\t";

      const parseLine = (line) => {
        let cols = [],
          inQuotes = false,
          current = "";
        for (let char of line) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === delimiter && !inQuotes) {
            cols.push(current.trim().replace(/^"|"$/g, ""));
            current = "";
          } else current += char;
        }
        cols.push(current.trim().replace(/^"|"$/g, ""));
        return cols;
      };

      const headers = parseLine(cleanLines[0]).map((h) => normalizeStr(h));
      const findCol = (keywords) => {
        let idx = headers.findIndex((h) => keywords.some((k) => h === k));
        if (idx !== -1) return idx;
        return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
      };

      const colMap = {
        nome: findCol(["nome", "seguidor", "membro", "jovem", "nome completo"]),
        tipo: findCol(["categoria", "tipo", "idade", "casal", "adulto"]),
        sexo: findCol(["sexo", "genero", "rapaz", "moca", "menina", "menino"]),
        telefone: findCol([
          "telefone",
          "celular",
          "contato",
          "tel",
          "whatsapp",
        ]),
        paroquia: findCol(["paroquia", "igreja", "comunidade"]),
        equipe: findCol(["equipe", "pasta", "trabalho", "qual equipe"]),
        funcao: findCol(["funcao", "cargo", "papel"]),
      };

      if (colMap.nome === -1 || colMap.equipe === -1)
        return showToast(`Erro nas colunas!`, "error");

      const batch = writeBatch(db);
      let countAdicionados = 0,
        falhasEquipe = [];

      for (let i = 1; i < cleanLines.length; i++) {
        let cols = parseLine(cleanLines[i]);
        if (!cols[colMap.nome] || !cols[colMap.equipe]) continue;

        const nome = cols[colMap.nome];
        const eqNorm = normalizeStr(cols[colMap.equipe]).replace(
          /(equipe da |equipe do |equipe de |equipe dos )/g,
          ""
        );

        const equipeReal = currentEquipes.find((eq) => {
          const targetNorm = normalizeStr(eq.name).replace(
            /(equipe da |equipe do |equipe de |equipe dos )/g,
            ""
          );
          return (
            targetNorm === eqNorm ||
            targetNorm.includes(eqNorm) ||
            eqNorm.includes(targetNorm) ||
            (eqNorm.includes("comando") && targetNorm.includes("comandante")) ||
            (eqNorm.includes("circulo") && targetNorm.includes("circulos"))
          );
        });

        if (equipeReal) {
          const fullTextLine = cols.join(" ").toLowerCase();
          let tipo =
            fullTextLine.includes("adulto") ||
            fullTextLine.includes("casal") ||
            fullTextLine.includes("tio") ||
            fullTextLine.includes("tia")
              ? "Adulto"
              : "Jovem";
          if (colMap.tipo !== -1 && cols[colMap.tipo]) {
            const cat = cols[colMap.tipo].toLowerCase();
            if (
              cat.includes("rapaz") ||
              cat.includes("moça") ||
              cat.includes("moca") ||
              cat.includes("jovem")
            )
              tipo = "Jovem";
          }

          let sexo = "M",
            sexoStr =
              colMap.sexo !== -1 && cols[colMap.sexo]
                ? cols[colMap.sexo].toLowerCase()
                : "",
            nomeMinusculo = nome.toLowerCase();
          if (
            sexoStr === "f" ||
            sexoStr.includes("moça") ||
            sexoStr.includes("moca") ||
            sexoStr === "tia" ||
            sexoStr.includes("mulher") ||
            sexoStr.includes("menina")
          )
            sexo = "F";
          else if (sexoStr.includes("tio/tia") || sexoStr === "") {
            const pNome = nomeMinusculo.split(" ")[0];
            if (
              nomeMinusculo.includes("esposa") ||
              pNome.endsWith("a") ||
              (pNome.endsWith("e") && !pNome.includes("andre"))
            )
              sexo = "F";
          }

          let dbPerson = bancoGeral.find(
            (b) => normalizeStr(b.name) === normalizeStr(nome)
          );
          if (!dbPerson) {
            dbPerson = {
              id: generateId(),
              name: nome,
              tipo,
              sexo,
              telefone: cols[colMap.telefone] || "",
              paroquia: cols[colMap.paroquia] || "",
              history: [{ ano: currentAno.name, equipe: equipeReal.name }],
            };
          } else {
            if (
              !dbPerson.history?.some(
                (h) => h.ano === currentAno.name && h.equipe === equipeReal.name
              )
            ) {
              dbPerson.history = [
                ...(dbPerson.history || []),
                { ano: currentAno.name, equipe: equipeReal.name },
              ];
            }
          }
          batch.set(getDocRef("bancoGeral", dbPerson.id), dbPerson); // Atualiza banco

          if (!membrosEquipe.find((m) => m.dbId === dbPerson.id)) {
            const newMem = {
              id: generateId(),
              equipeId: equipeReal.id,
              dbId: dbPerson.id,
              name: dbPerson.name,
              sexo: dbPerson.sexo,
              funcao: cols[colMap.funcao] || "Componente",
            };
            batch.set(getDocRef("membrosEquipe", newMem.id), newMem); // Adiciona na equipe
            countAdicionados++;
          }
        } else {
          if (!falhasEquipe.includes(cols[colMap.equipe]))
            falhasEquipe.push(cols[colMap.equipe]);
        }
      }

      await batch.commit(); // Salva tudo na nuvem de uma vez!
      if (falhasEquipe.length > 0)
        showToast(
          `Importados: ${countAdicionados}. Não achei: ${falhasEquipe.join(
            ", "
          )}`,
          "error"
        );
      else
        showToast(
          `Sucesso! ${countAdicionados} membros importados para a nuvem.`
        );

      setIsImportModalOpen(false);
      if (e.target) e.target.value = null;
    };
    reader.readAsText(file, "UTF-8");
  };

  if (!selectedEquipe) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800">
              Equipes de Trabalho
            </h2>
            <p className="text-slate-500">
              Gerencie a escala oficial do {currentAno?.name}.
            </p>
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md"
          >
            <Upload className="w-4 h-4" /> Importar Planilha (Nuvem)
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentEquipes.map((eq) => {
            const members = membrosEquipe.filter((m) => m.equipeId === eq.id);
            const isIncomplete = members.length < eq.vagas;
            return (
              <div
                key={eq.id}
                onClick={() => setSelectedEquipe(eq)}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <h3 className="font-bold text-slate-800 text-lg mb-1 pr-6 leading-tight group-hover:text-indigo-600 transition">
                  {eq.name}
                </h3>
                {isIncomplete && (
                  <span className="absolute top-4 right-4 bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Incompleta
                  </span>
                )}
                {!isIncomplete && (
                  <span className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Completa
                  </span>
                )}
                <div className="mt-4 flex justify-between items-center">
                  <span
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      isIncomplete ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    <Users className="w-4 h-4" /> {members.length} / {eq.vagas}{" "}
                    vagas
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal de Importação (Omitido visual longo por brevidade, já existe a lógica) */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-3xl w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">
                  Importar Membros (CSV)
                </h3>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:border-indigo-400">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">
                    Clique para selecionar o .CSV
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCSV}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }

  const membersInTeam = membrosEquipe.filter(
    (m) => m.equipeId === selectedEquipe.id
  );

  const handleAddMember = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const origin = data.get("origin");

    let finalId = generateId(),
      finalDbId = null,
      nome = "",
      sexo = "";

    if (origin === "bd") {
      const dbId = data.get("bdPersonId");
      const dbPerson = bancoGeral.find((b) => b.id === dbId);
      if (!dbPerson) return;
      nome = dbPerson.name;
      sexo = dbPerson.sexo;
      finalDbId = dbPerson.id;
    } else {
      nome = data.get("nome");
      sexo = data.get("sexo");
      finalDbId = generateId();

      let fotoBase64 = null;
      const file = data.get("foto");
      if (file && file.size > 0) {
        fotoBase64 = await handleImageUpload(file);
      }

      const newDbEntry = {
        id: finalDbId,
        name: nome,
        sexo,
        tipo: data.get("tipo"),
        foto: fotoBase64,
        history: [{ ano: currentAno.name, equipe: selectedEquipe.name }],
      };
      await setDoc(getDocRef("bancoGeral", finalDbId), newDbEntry);
    }

    if (membrosEquipe.some((m) => m.dbId === finalDbId))
      return showToast(`Erro: ${nome} já está em outra equipe!`, "error");

    const newMember = {
      id: finalId,
      equipeId: selectedEquipe.id,
      dbId: finalDbId,
      name: nome,
      sexo,
      funcao: data.get("funcao") || "Componente",
    };
    await setDoc(getDocRef("membrosEquipe", finalId), newMember);
    e.target.reset();
    showToast("Membro salvo na nuvem!");
  };

  const removeMember = async (id) => {
    if (window.confirm("Remover membro da equipe?")) {
      await deleteDoc(getDocRef("membrosEquipe", id));
      showToast("Membro removido.");
    }
  };

  const handleTransfer = async (novoEquipeId) => {
    if (!novoEquipeId) return;
    const member = membrosEquipe.find((m) => m.id === transferModal.membro.id);
    await setDoc(getDocRef("membrosEquipe", member.id), {
      ...member,
      equipeId: novoEquipeId,
    });
    setTransferModal({ open: false, membro: null });
    showToast("Transferência sincronizada!");
  };

  const handleCloseEquipe = async () => {
    const batch = writeBatch(db);
    membersInTeam.forEach((m) => {
      let person = bancoGeral.find((b) => b.id === m.dbId);
      if (
        person &&
        !person.history?.some(
          (h) => h.ano === currentAno.name && h.equipe === selectedEquipe.name
        )
      ) {
        person.history = [
          ...(person.history || []),
          { ano: currentAno.name, equipe: selectedEquipe.name },
        ];
        batch.set(getDocRef("bancoGeral", person.id), person);
      }
    });
    await batch.commit();
    showToast("Equipe fechada! Histórico salvo para todos no Banco Geral.");
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300">
      <button
        onClick={() => setSelectedEquipe(null)}
        className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition"
      >
        <ArrowRight className="w-4 h-4 rotate-180" /> Voltar para Equipes
      </button>

      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white gap-4">
          <div>
            <h2 className="text-3xl font-black">{selectedEquipe.name}</h2>
            <p className="text-slate-400 font-medium">
              Vagas: {membersInTeam.length} / {selectedEquipe.vagas}
            </p>
          </div>
          <button
            onClick={handleCloseEquipe}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-900/50"
          >
            <CheckCircle className="w-5 h-5" /> Fechar Equipe (Salvar Histórico)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="p-6 bg-slate-50 border-r border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500" /> Adicionar Membro
            </h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">
                  Origem
                </label>
                <select
                  name="origin"
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg outline-none font-bold text-sm"
                  onChange={(e) => {
                    document.getElementById("novoForm").style.display =
                      e.target.value === "novo" ? "block" : "none";
                    document.getElementById("bdForm").style.display =
                      e.target.value === "bd" ? "block" : "none";
                  }}
                >
                  <option value="novo">Cadastrar Novo (Manual)</option>
                  <option value="bd">Puxar do Banco Geral</option>
                </select>
              </div>

              <div id="bdForm" style={{ display: "none" }}>
                <label className="text-xs font-bold text-slate-500">
                  Buscar no BD
                </label>
                <select
                  name="bdPersonId"
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                >
                  <option value="">-- Selecione uma pessoa --</option>
                  {bancoGeral
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.tipo})
                      </option>
                    ))}
                </select>
              </div>

              <div id="novoForm" className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">
                    Foto (Opcional)
                  </label>
                  <input
                    type="file"
                    name="foto"
                    accept="image/*"
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">
                    Nome
                  </label>
                  <input
                    type="text"
                    name="nome"
                    className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      Categoria
                    </label>
                    <select
                      name="tipo"
                      className="w-full mt-1 p-2 bg-white border rounded-lg text-sm"
                    >
                      <option value="Jovem">Jovem</option>
                      <option value="Adulto">Adulto</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      Sexo
                    </label>
                    <select
                      name="sexo"
                      className="w-full mt-1 p-2 bg-white border rounded-lg text-sm"
                    >
                      <option value="M">Masc</option>
                      <option value="F">Fem</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500">
                  Função
                </label>
                <input
                  type="text"
                  name="funcao"
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold"
              >
                Salvar na Equipe
              </button>
            </form>
          </div>

          <div className="p-6 lg:col-span-2">
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {membersInTeam.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium">
                  Nenhum membro escalado.
                </div>
              ) : (
                membersInTeam.map((member) => {
                  const isTio = circulos.find((c) => c.tioId === member.dbId);
                  const isTia = circulos.find((c) => c.tiaId === member.dbId);
                  const isApoio = circulos.find(
                    (c) => c.apoioId === member.dbId
                  );
                  const circuloRole = isTio
                    ? { role: "Tio", cor: isTio.cor }
                    : isTia
                    ? { role: "Tia", cor: isTia.cor }
                    : isApoio
                    ? { role: "Apoio", cor: isApoio.cor }
                    : null;

                  const dbData = bancoGeral.find((b) => b.id === member.dbId);

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black overflow-hidden shrink-0">
                          {dbData?.foto ? (
                            <img
                              src={dbData.foto}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            member.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-2">
                            {member.name}
                            {circuloRole && (
                              <span
                                className={`text-[9px] uppercase tracking-wider text-white px-2 py-0.5 rounded-full ${getCorBadge(
                                  circuloRole.cor
                                )}`}
                              >
                                {circuloRole.role} {circuloRole.cor}
                              </span>
                            )}
                          </p>
                          <p className="text-xs font-medium text-slate-500 uppercase">
                            {member.funcao}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            setTransferModal({ open: true, membro: member })
                          }
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {transferModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">
                Transferir Membro
              </h3>
              <button
                onClick={() => setTransferModal({ open: false, membro: null })}
                className="p-2 bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <select
              onChange={(e) => handleTransfer(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
            >
              <option value="">Selecione a nova equipe</option>
              {currentEquipes
                .filter((e) => e.id !== selectedEquipe.id)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
