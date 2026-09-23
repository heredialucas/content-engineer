"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Project = { id: string; name: string; description: string; count: number };
type Piece = {
  id: string;
  date: string;
  project: string;
  contentType: string;
  format?: string;
  topic: string;
  idea: string;
  files: Record<string, string>;
  status: string;
};
type Kind = "post" | "story" | "video";
type Tab = "create" | "library" | "projects";

const formats: { id: Kind; title: string; description: string; icon: string; ratio: string }[] = [
  { id: "post", title: "Imagen para post", description: "Una imagen lista para tu feed.", icon: "▧", ratio: "4:5" },
  { id: "story", title: "Historia", description: "Vertical, ideal para historias.", icon: "▯", ratio: "9:16" },
  { id: "video", title: "Video corto", description: "Imagen animada para Reel o anuncio.", icon: "▶", ratio: "9:16 · 8 s" },
];

const mediaUrl = (project: string, file: string | undefined) => {
  if (!file) return "";
  const prefix = `projects/${project}/`;
  const relative = file.startsWith(prefix) ? file.slice(prefix.length) : file;
  return `/api/media/${encodeURIComponent(project)}/${relative.split("/").map(encodeURIComponent).join("/")}`;
};

function prettyDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value));
}

export default function Studio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [projectId, setProjectId] = useState("");
  const [tab, setTab] = useState<Tab>("create");
  const [kind, setKind] = useState<Kind>("post");
  const [prompt, setPrompt] = useState("");
  const [reference, setReference] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectTone, setProjectTone] = useState("Directo, claro y cercano.");
  const [projectBusy, setProjectBusy] = useState(false);

  const currentProject = projects.find((project) => project.id === projectId);
  const selectedFormat = formats.find((format) => format.id === kind)!;

  const refreshProjects = useCallback(async () => {
    const response = await fetch("/api/projects", { cache: "no-store" });
    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }
    const data = (await response.json()) as { projects?: Project[]; error?: string };
    if (!response.ok) throw new Error(data.error || "No pudimos cargar tus proyectos.");
    const rows = data.projects ?? [];
    setProjects(rows);
    setProjectId((current) => (rows.some((project) => project.id === current) ? current : rows[0]?.id ?? ""));
  }, []);

  const refreshPieces = useCallback(async (id: string) => {
    if (!id) {
      setPieces([]);
      return;
    }
    const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("No pudimos cargar las creaciones de este proyecto.");
    const data = (await response.json()) as { pieces?: Piece[] };
    setPieces(data.pieces ?? []);
  }, []);

  useEffect(() => {
    refreshProjects()
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [refreshProjects]);

  useEffect(() => {
    refreshPieces(projectId).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Error al cargar."));
  }, [projectId, refreshPieces]);

  const visiblePieces = useMemo(() => pieces, [pieces]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = new FormData();
      data.set("project", projectId);
      data.set("kind", kind);
      data.set("prompt", prompt);
      if (reference) data.set("reference", reference);
      const response = await fetch("/api/generate", { method: "POST", body: data });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo generar. Probá de nuevo.");
      setNotice(result.message || "Creación lista y guardada en tu biblioteca.");
      setPrompt("");
      setReference(null);
      const fileInput = document.getElementById("reference-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      await Promise.all([refreshPieces(projectId), refreshProjects()]);
      setTab("library");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo generar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProjectBusy(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, description: projectDescription, tone: projectTone }),
      });
      const result = (await response.json()) as { project?: Project; error?: string };
      if (!response.ok || !result.project) throw new Error(result.error || "No pudimos crear el proyecto.");
      await refreshProjects();
      setProjectId(result.project.id);
      setProjectName("");
      setProjectDescription("");
      setProjectTone("Directo, claro y cercano.");
      setShowProjectForm(false);
      setTab("create");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear el proyecto.");
    } finally {
      setProjectBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  function chooseReference(event: ChangeEvent<HTMLInputElement>) {
    setReference(event.target.files?.[0] ?? null);
  }

  return (
    <div className="studio-shell">
      <header className="topbar">
        <a aria-label="Content Studio inicio" className="wordmark" href="/">
          <span className="brand-mark brand-mark-small">C</span>
          <span>content<span className="wordmark-light">studio</span></span>
        </a>
        <div className="topbar-right">
          <span className="online-dot" />
          <span className="topbar-caption">Tu espacio privado</span>
          <button className="avatar-button" onClick={logout} title="Cerrar sesión" type="button">L</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-section-label">ESPACIO DE TRABAJO</div>
          <label className="project-select-label" htmlFor="project-select">Proyecto activo</label>
          <select id="project-select" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
            {projects.length === 0 ? <option value="">Sin proyectos</option> : null}
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <button className="sidebar-add" onClick={() => setShowProjectForm(true)} type="button">
            <span>＋</span> Crear proyecto
          </button>
          <div className="side-divider" />
          <nav aria-label="Navegación principal" className="side-nav">
            <button className={tab === "create" ? "side-nav-item active" : "side-nav-item"} onClick={() => setTab("create")} type="button"><span>✳</span> Crear contenido</button>
            <button className={tab === "library" ? "side-nav-item active" : "side-nav-item"} onClick={() => setTab("library")} type="button"><span>▦</span> Mis creaciones <span className="nav-count">{pieces.length}</span></button>
            <button className={tab === "projects" ? "side-nav-item active" : "side-nav-item"} onClick={() => setTab("projects")} type="button"><span>▣</span> Proyectos</button>
          </nav>
          <div className="sidebar-bottom">
            <div className="help-card"><span className="help-icon">✦</span><strong>Una idea, muchas posibilidades.</strong><span>Elegí un formato y empezá a crear.</span></div>
            <span className="sidebar-version">CONTENT STUDIO · 1.0</span>
          </div>
        </aside>

        <main className="main-content">
          <div className="mobile-project-bar">
            <span className="mobile-project-label">PROYECTO</span>
            <select aria-label="Proyecto activo" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>

          {notice ? <div className="notice" role="status"><span>✓</span>{notice}<button aria-label="Cerrar" onClick={() => setNotice("")} type="button">×</button></div> : null}
          {error ? <div className="error-banner" role="alert">{error}<button aria-label="Cerrar" onClick={() => setError("")} type="button">×</button></div> : null}

          {tab === "create" ? (
            <section className="page-section">
              <div className="page-heading-row">
                <div>
                  <p className="eyebrow">{currentProject ? currentProject.name.toUpperCase() : "TU ESTUDIO CREATIVO"}</p>
                  <h1>¿Qué vamos a crear?</h1>
                  <p className="page-subtitle">Una buena idea merece verse bien. Empezá por elegir el formato.</p>
                </div>
                <div className="heading-sparkle">✳</div>
              </div>

              {loading ? <div className="loading-panel">Preparando tu espacio…</div> : null}
              {!loading && projects.length === 0 ? (
                <div className="empty-projects">
                  <div className="empty-icon">▣</div>
                  <h2>Empezá por tu primer proyecto</h2>
                  <p>Creá un espacio para guardar la identidad y el contenido de cada negocio.</p>
                  <button className="button button-primary" onClick={() => setShowProjectForm(true)} type="button">＋ Crear mi primer proyecto</button>
                </div>
              ) : null}

              {projects.length > 0 ? <>
                <div className="format-grid" role="group" aria-label="Elegí un formato">
                  {formats.map((format) => (
                    <button
                      aria-pressed={kind === format.id}
                      className={kind === format.id ? "format-card selected" : "format-card"}
                      key={format.id}
                      onClick={() => setKind(format.id)}
                      type="button"
                    >
                      <span className={`format-icon format-icon-${format.id}`}>{format.icon}</span>
                      <span className="format-text"><strong>{format.title}</strong><span>{format.description}</span></span>
                      <span className="format-ratio">{format.ratio}</span>
                      <span className="format-radio" />
                    </button>
                  ))}
                </div>

                <form className="creator-card" onSubmit={generate}>
                  <div className="creator-card-heading">
                    <div><span className="step-number">01</span><div><h2>Contanos tu idea</h2><p>Cuanto más concreto, mejor va a ser el resultado.</p></div></div>
                    <span className="ai-badge"><span>✦</span> IA creativa</span>
                  </div>
                  <label className="sr-only" htmlFor="creative-prompt">Describe qué querés crear</label>
                  <textarea
                    id="creative-prompt"
                    maxLength={1800}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={kind === "video" ? "Ej.: Un video breve y moderno para mostrar las nuevas zapatillas de running, con energía y luz natural…" : "Ej.: Una imagen cálida de una mesa compartida con empanadas recién hechas, ideal para presentar el menú del fin de semana…"}
                    required
                    rows={4}
                    value={prompt}
                  />
                  <div className="prompt-footer"><span>Describí la escena, producto o sensación que buscás.</span><span>{prompt.length}/1800</span></div>
                  <div className="creator-actions">
                    <label className="upload-button" htmlFor="reference-file"><span>＋</span> Agregar foto de referencia <span className="optional-label">opcional</span></label>
                    <input accept="image/png,image/jpeg,image/webp" className="file-input" id="reference-file" onChange={chooseReference} type="file" />
                    {reference ? <span className="selected-file">{reference.name}<button aria-label="Quitar imagen" onClick={() => { setReference(null); const input = document.getElementById("reference-file") as HTMLInputElement | null; if (input) input.value = ""; }} type="button">×</button></span> : null}
                    <span className="action-spacer" />
                    <button className="button button-primary generate-button" disabled={busy || prompt.trim().length < 8} type="submit">
                      {busy ? <><span className="spinner" /> {kind === "video" ? "Creando tu video…" : "Creando tu imagen…"}</> : <>Generar {kind === "video" ? "video" : "imagen"}<span aria-hidden="true">→</span></>}
                    </button>
                  </div>
                  {busy ? <p className="generation-note">La generación puede tardar un minuto. Podés dejar esta pestaña abierta.</p> : null}
                </form>

                <div className="below-hint"><span className="hint-icon">✦</span><span><strong>Siempre podés volver a empezar.</strong> Tus creaciones quedan guardadas dentro de {currentProject?.name ?? "tu proyecto"}.</span></div>
                <div className="recent-heading"><div><h2>Últimas creaciones</h2><p>Lo más reciente de este proyecto.</p></div><button className="text-button" onClick={() => setTab("library")} type="button">Ver biblioteca <span>→</span></button></div>
                {visiblePieces.length ? <PieceGrid pieces={visiblePieces.slice(0, 3)} project={projectId} /> : <div className="first-creation">Tus primeras creaciones van a aparecer acá.</div>}
              </> : null}
            </section>
          ) : null}

          {tab === "library" ? (
            <section className="page-section">
              <div className="page-heading-row"><div><p className="eyebrow">{currentProject?.name.toUpperCase() ?? "BIBLIOTECA"}</p><h1>Mis creaciones</h1><p className="page-subtitle">Todo el contenido de este proyecto, en un solo lugar.</p></div><button className="button button-primary heading-action" onClick={() => setTab("create")} type="button">＋ Crear contenido</button></div>
              {visiblePieces.length ? <PieceGrid pieces={visiblePieces} project={projectId} /> : <div className="empty-projects compact"><div className="empty-icon">▦</div><h2>Todavía no hay creaciones</h2><p>Cuando generes una imagen o un video, lo vas a encontrar acá.</p><button className="button button-primary" onClick={() => setTab("create")} type="button">Crear mi primera pieza</button></div>}
            </section>
          ) : null}

          {tab === "projects" ? (
            <section className="page-section">
              <div className="page-heading-row"><div><p className="eyebrow">TU ESPACIO DE TRABAJO</p><h1>Proyectos</h1><p className="page-subtitle">Cada marca tiene su propio espacio y sus propias creaciones.</p></div><button className="button button-primary heading-action" onClick={() => setShowProjectForm(true)} type="button">＋ Nuevo proyecto</button></div>
              <div className="projects-grid">{projects.map((project, index) => <button className={project.id === projectId ? "project-card current" : "project-card"} key={project.id} onClick={() => { setProjectId(project.id); setTab("create"); }} type="button"><span className={`project-monogram monogram-${index % 4}`}>{project.name.slice(0, 1).toUpperCase()}</span><span className="project-card-copy"><strong>{project.name}</strong><span>{project.description}</span><small>{project.count} {project.count === 1 ? "creación" : "creaciones"}</small></span><span className="project-arrow">→</span></button>)}</div>
              <button className="add-project-card" onClick={() => setShowProjectForm(true)} type="button"><span>＋</span><strong>Agregar otro proyecto</strong><small>Una marca, un espacio propio.</small></button>
            </section>
          ) : null}
        </main>
      </div>

      <nav aria-label="Navegación móvil" className="mobile-nav">
        <button className={tab === "create" ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setTab("create")} type="button"><span>✳</span>Crear</button>
        <button className={tab === "library" ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setTab("library")} type="button"><span>▦</span>Biblioteca</button>
        <button className={tab === "projects" ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setTab("projects")} type="button"><span>▣</span>Proyectos</button>
        <button className="mobile-nav-item" onClick={logout} type="button"><span>↪</span>Salir</button>
      </nav>

      {showProjectForm ? (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowProjectForm(false); }}>
          <section aria-labelledby="project-modal-title" aria-modal="true" className="modal-card" role="dialog">
            <button aria-label="Cerrar" className="modal-close" onClick={() => setShowProjectForm(false)} type="button">×</button>
            <p className="eyebrow">NUEVO ESPACIO</p>
            <h2 id="project-modal-title">Creá un proyecto</h2>
            <p className="modal-intro">Cada negocio tiene su propia identidad e ideas.</p>
            <form className="project-form" onSubmit={createProject}>
              <label htmlFor="project-name">Nombre del proyecto</label>
              <input autoFocus id="project-name" maxLength={80} onChange={(event) => setProjectName(event.target.value)} placeholder="Ej.: Mi marca de comidas" required value={projectName} />
              <label htmlFor="project-description">¿Qué ofrece o comunica?</label>
              <textarea id="project-description" maxLength={800} onChange={(event) => setProjectDescription(event.target.value)} placeholder="Una descripción breve para darle contexto a la IA…" required rows={3} value={projectDescription} />
              <label htmlFor="project-tone">Tono de comunicación</label>
              <input id="project-tone" onChange={(event) => setProjectTone(event.target.value)} value={projectTone} />
              <button className="button button-primary button-wide" disabled={projectBusy} type="submit">{projectBusy ? "Creando…" : "Crear proyecto"}<span>→</span></button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function PieceGrid({ pieces, project }: { pieces: Piece[]; project: string }) {
  return <div className="piece-grid">{pieces.map((piece) => {
    const video = piece.files.video;
    const image = piece.files.image;
    return <article className="piece-card" key={piece.id}>
      <div className="piece-media">
        {video ? <video controls playsInline preload="metadata" src={mediaUrl(project, video)} /> : image ? <img alt={piece.topic || "Imagen creada"} loading="lazy" src={mediaUrl(project, image)} /> : <div className="piece-placeholder">✳</div>}
        <span className="piece-kind">{video ? "VIDEO CORTO" : piece.format === "story" ? "HISTORIA · 9:16" : piece.format === "post" ? "POST · 4:5" : "IMAGEN"}</span>
      </div>
      <div className="piece-details"><div><h3>{piece.topic || "Nueva creación"}</h3><p>{prettyDate(piece.date)}</p></div><div className="piece-tools"><a aria-label="Descargar creación" className="piece-download" download={`${piece.id}.${video ? "mp4" : "png"}`} href={mediaUrl(project, video || image)}>↓ Descargar</a><a aria-label="Abrir creación" className="piece-open" href={mediaUrl(project, video || image)} rel="noreferrer" target="_blank">↗</a></div></div>
    </article>;
  })}</div>;
}
