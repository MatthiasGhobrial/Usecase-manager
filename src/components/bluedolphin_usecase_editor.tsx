import { useState, useEffect, useCallback, useRef } from "react"
import {
  Box,
  Button,
  Dialog,
  HStack,
  VStack,
  Text,
  Spinner,
} from "@chakra-ui/react"
import { callGithubSync } from "@/lib/supabase"

const STAGES = ["Foundation", "Expanding", "Optimising"] as const
const STAGE_DESC: Record<string, string> = {
  Foundation: "Core setup — getting started",
  Expanding: "Building depth and connections",
  Optimising: "Driving decisions and value",
}
const TYPES = ["Core", "Contextual", "Cross-cutting"] as const
const DELIVERY = ["Guided session", "Customer independent"] as const

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Foundation: { bg: "#EEEDFE", text: "#3C3489", border: "#7F77DD" },
  Expanding: { bg: "#E1F5EE", text: "#085041", border: "#1D9E75" },
  Optimising: { bg: "#FAEEDA", text: "#633806", border: "#BA7517" },
}
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Core: { bg: "#E1F5EE", text: "#085041" },
  Contextual: { bg: "#FAEEDA", text: "#633806" },
  "Cross-cutting": { bg: "#EEEDFE", text: "#3C3489" },
}
const DELIVERY_DOT: Record<string, string> = {
  "Guided session": "#7F77DD",
  "Customer independent": "#888780",
}
const UC_COLORS = [
  { bg: "#EEEDFE", text: "#3C3489", border: "#7F77DD" },
  { bg: "#FAEEDA", text: "#633806", border: "#BA7517" },
  { bg: "#FAECE7", text: "#712B13", border: "#D85A30" },
  { bg: "#E6F1FB", text: "#0C447C", border: "#378ADD" },
  { bg: "#FBEAF0", text: "#72243E", border: "#D4537E" },
  { bg: "#E1F5EE", text: "#085041", border: "#1D9E75" },
  { bg: "#EAF3DE", text: "#27500A", border: "#639922" },
]

const uid = () => Math.random().toString(36).slice(2, 9)

interface Step {
  id: string
  stage: string
  title: string
  type: string
  delivery: string
  description: string
  dependencies: { ucId: string; stepId: string }[]
  effortBD: number | null
  effortCustomer: number | null
  hasExistingContent?: boolean
  existingContentLink?: string | null
}

interface Usecase {
  id: string
  name: string
  colorIdx: number
  steps: Step[]
  stageDescriptions?: Record<string, string>
}

const defaultUsecases = (): Usecase[] => [
  { id: uid(), name: "Application landscape", colorIdx: 0, steps: [
    mk("Foundation","Convention model","Cross-cutting","Guided session","Agree on naming, object types, lifecycle states, and ownership rules."),
    mk("Foundation","Import or populate initial landscape","Core","Guided session","Load existing application data from CMDB, spreadsheets, or previous tool."),
    mk("Foundation","Assign ownership per application","Core","Customer independent","Record a responsible owner for each application."),
    mk("Foundation","Set lifecycle status for all applications","Core","Customer independent","Tag each application with its current lifecycle state."),
    mk("Foundation","Build and share first landscape view","Core","Guided session","Create a landscape overview view or dashboard."),
    mk("Foundation","Map applications to business capabilities","Contextual","Guided session","Link each application to the capabilities it supports."),
    mk("Expanding","Enrich with technical and business attributes","Core","Customer independent","Add hosting model, vendor, cost, risk rating."),
    mk("Expanding","Map application integrations and dependencies","Core","Guided session","Identify and record integration points."),
    mk("Expanding","Establish data maintenance process","Core","Customer independent","Define who updates the landscape and how."),
    mk("Expanding","Reference architecture import or build","Contextual","Guided session","Establish a reference architecture and link applications."),
    mk("Optimising","Build rationalisation analysis","Core","Guided session","Identify redundant or consolidation-candidate applications."),
    mk("Optimising","Embed landscape in governance and decisions","Core","Guided session","Make BlueDolphin the system of record for application decisions."),
  ]},
  { id: uid(), name: "Strategic planning", colorIdx: 1, steps: [
    mk("Foundation","Convention model","Cross-cutting","Guided session","Agree on how strategic objects are named and structured."),
    mk("Foundation","Capture company vision and strategic goals","Core","Guided session","Translate strategic priorities into structured goal objects."),
    mk("Foundation","Build or import business capability model","Core","Guided session","Define the L1/L2 capability model."),
    mk("Foundation","Link strategic goals to capabilities","Core","Guided session","Trace each goal to the capabilities it depends on."),
    mk("Expanding","Define current state baseline","Core","Customer independent","Document current state using landscape and capability mapping."),
    mk("Expanding","Design target state architecture","Core","Guided session","Model the desired future state."),
    mk("Expanding","Identify and document architectural debt","Core","Customer independent","Surface technical debt and legacy risk."),
    mk("Optimising","Build strategic roadmap","Core","Guided session","Sequence initiatives with time horizons and dependencies."),
    mk("Optimising","Present strategic overview to management","Core","Guided session","Use BlueDolphin views to present roadmap."),
    mk("Optimising","Establish strategy review cadence","Core","Customer independent","Define a recurring cycle to review and update goals."),
  ]},
  { id: uid(), name: "Process modelling", colorIdx: 2, steps: [
    mk("Foundation","Convention model","Cross-cutting","Guided session","Agree on notation, naming conventions, and ownership rules."),
    mk("Foundation","Model first process together","Core","Guided session","Select one real process and model it end-to-end."),
    mk("Foundation","Assign process ownership","Core","Customer independent","Assign a named owner to each process."),
    mk("Expanding","Build out process library per domain","Core","Customer independent","Systematically model key processes per domain."),
    mk("Expanding","Model as-is and to-be process variants","Contextual","Guided session","Model both current and future versions."),
    mk("Optimising","Use process models in impact analysis","Core","Customer independent","Trace downstream business impact."),
    mk("Optimising","Identify process improvement opportunities","Core","Guided session","Analyse the library for inefficiencies."),
  ]},
  { id: uid(), name: "Solution design", colorIdx: 3, steps: [
    mk("Foundation","Convention model","Cross-cutting","Guided session","Agree on design notation and object types."),
    mk("Foundation","Select first design case","Core","Guided session","Identify a real project for the first design."),
    mk("Foundation","Model as-is and to-be architecture","Core","Guided session","Document current and proposed solution."),
    mk("Expanding","Establish solution design templates","Core","Guided session","Create reusable templates in BlueDolphin."),
    mk("Expanding","Link solution designs to landscape and roadmap","Core","Customer independent","Connect approved designs to applications."),
    mk("Optimising","Retrospect on design decisions and patterns","Core","Guided session","Review completed designs for patterns."),
    mk("Optimising","Require design artefact in project intake","Core","Customer independent","Make a design mandatory for intake."),
  ]},
  { id: uid(), name: "Projects", colorIdx: 4, steps: [
    mk("Foundation","Convention model","Cross-cutting","Guided session","Agree on project object attributes and lifecycle."),
    mk("Foundation","Register active architecture projects","Core","Customer independent","Enter active architecture projects."),
    mk("Foundation","Link projects to affected applications","Core","Customer independent","Record which applications each project changes."),
    mk("Expanding","Track project status and architecture impact","Core","Guided session","Maintain lifecycle states and communicate progress."),
    mk("Optimising","Use portfolio for architecture investment decisions","Core","Guided session","Analyse portfolio for investment decisions."),
    mk("Optimising","Close the loop: update landscape on completion","Core","Customer independent","Update landscape on project closure."),
  ]},
  { id: uid(), name: "Data modelling", colorIdx: 5, steps: [
    mk("Foundation","Convention model","Cross-cutting","Guided session","Agree on entity naming and relationship types."),
    mk("Foundation","Define scope and level of abstraction","Core","Guided session","Agree on domains and logical level modelling."),
    mk("Foundation","Model first domain — entities and relationships","Core","Guided session","Model core entities and relationships for one domain."),
    mk("Foundation","Assign data ownership per entity","Core","Customer independent","Record a named owner for each entity."),
    mk("Expanding","Build out logical data model per domain","Core","Customer independent","Systematically model entities for each domain."),
    mk("Expanding","Map data flows between applications","Core","Guided session","Identify how key entities flow between applications."),
    mk("Optimising","Use data model in solution design","Core","Guided session","Reference data model when designing solutions."),
    mk("Optimising","Identify master data gaps and ownership conflicts","Core","Guided session","Find entities without a clear master source."),
  ]},
  { id: uid(), name: "Technical architecture", colorIdx: 6, steps: [
    mk("Foundation","Convention model","Cross-cutting","Guided session","Agree on object types and lifecycle states for technology."),
    mk("Foundation","Inventory platforms and infrastructure","Core","Guided session","Register platforms, runtimes, and infrastructure."),
    mk("Foundation","Link technology components to applications","Core","Customer independent","Record which platform each application runs on."),
    mk("Foundation","Set lifecycle status per technology component","Core","Customer independent","Tag each component with its lifecycle state."),
    mk("Expanding","Define technology standards and principles","Core","Guided session","Document approved standards and link to reference architecture."),
    mk("Expanding","Map deployment patterns","Core","Customer independent","Document recurring deployment patterns."),
    mk("Optimising","Use technology view in governance and project intake","Core","Guided session","Make technology layer mandatory in reviews."),
    mk("Optimising","Build technology rationalisation analysis","Core","Guided session","Identify redundant or underutilised platforms."),
  ]},
]

function mk(stage: string, title: string, type: string, delivery: string, desc: string): Step {
  return { id: uid(), stage, title, type, delivery, description: desc, dependencies: [], effortBD: null, effortCustomer: null, hasExistingContent: false, existingContentLink: null }
}

function lookupStep(usecases: Usecase[], ucId: string, stepId: string) {
  const uc = usecases.find((u) => u.id === ucId)
  if (!uc) return null
  const step = uc.steps.find((s) => s.id === stepId)
  return step ? { ucName: uc.name, stepTitle: step.title, stage: step.stage } : null
}

export default function BlueDolphinUsecaseEditor() {
  const [usecases, setUsecases] = useState<Usecase[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIdx, setActiveIdx] = useState(0)
  const [editingName, setEditingName] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirtyState] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [lastCommitUrl, setLastCommitUrl] = useState<string | null>(null)
  const [editingStages, setEditingStages] = useState(false)

  const sha = useRef<string | null>(null)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const loadRemote = useCallback(async () => {
    const { status, body } = await callGithubSync<{ data: Usecase[] | null; sha: string | null }>({
      action: "load",
    })
    if (status !== 200) {
      console.error("load error", body)
      return null
    }
    return body
  }, [])

  const saveRemote = useCallback(
    async (data: Usecase[]) => {
      setSaving(true)
      const { status, body } = await callGithubSync<{ sha: string; commitUrl: string }>({
        action: "save",
        data,
        sha: sha.current,
      })
      setSaving(false)
      if (status === 409) {
        setConflict(true)
        flash("Save conflict")
        return false
      }
      if (status !== 200) {
        console.error("save error", body)
        flash("Save failed")
        return false
      }
      sha.current = body.sha
      setLastCommitUrl(body.commitUrl)
      setDirtyState(false)
      flash("Saved to GitHub")
      return true
    },
    [flash]
  )

  const init = useCallback(async () => {
    const rec = await loadRemote()
    if (rec && rec.data && rec.data.length > 0) {
      setUsecases(rec.data)
      sha.current = rec.sha
    } else {
      const initData = defaultUsecases()
      setUsecases(initData)
      sha.current = rec?.sha ?? null
      await saveRemote(initData)
    }
    setLoading(false)
  }, [loadRemote, saveRemote])

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reloadFromGithub = useCallback(async () => {
    const rec = await loadRemote()
    if (!rec) {
      flash("Reload failed")
      return
    }
    setUsecases(rec.data ?? defaultUsecases())
    sha.current = rec.sha
    setDirtyState(false)
    setConflict(false)
    flash("Reloaded latest version")
  }, [loadRemote, flash])

  const overwriteWithMine = useCallback(async () => {
    const rec = await loadRemote()
    sha.current = rec?.sha ?? null
    setConflict(false)
    await saveRemote(usecases)
  }, [loadRemote, saveRemote, usecases])

  const setDirty = useCallback(() => {
    setDirtyState(true)
  }, [])

  const updateStep = useCallback(
    (stepId: string, changes: Partial<Step>) => {
      setUsecases((prev) =>
        prev.map((u, i) => {
          if (i !== activeIdx) return u
          const step = u.steps.find((s) => s.id === stepId)
          if (!step) return u
          const updated = { ...step, ...changes }
          if (changes.stage && changes.stage !== step.stage) {
            return { ...u, steps: [...u.steps.filter((s) => s.id !== stepId), updated] }
          }
          return { ...u, steps: u.steps.map((s) => (s.id === stepId ? updated : s)) }
        })
      )
      setDirty()
    },
    [activeIdx, setDirty]
  )

  const deleteStep = useCallback(
    (stepId: string) => {
      setUsecases((prev) =>
        prev.map((u) => ({
          ...u,
          steps: u.steps
            .filter((s) => s.id !== stepId)
            .map((s) => ({ ...s, dependencies: s.dependencies.filter((d) => d.stepId !== stepId) })),
        }))
      )
      setDirty()
    },
    [setDirty]
  )

  const moveStep = useCallback(
    (stepId: string, stage: string, dir: "up" | "down") => {
      setUsecases((prev) =>
        prev.map((u, i) => {
          if (i !== activeIdx) return u
          const ss = u.steps.filter((s) => s.stage === stage)
          const idx = ss.findIndex((s) => s.id === stepId)
          if (dir === "up" && idx > 0) [ss[idx - 1], ss[idx]] = [ss[idx], ss[idx - 1]]
          if (dir === "down" && idx < ss.length - 1) [ss[idx], ss[idx + 1]] = [ss[idx + 1], ss[idx]]
          return { ...u, steps: STAGES.flatMap((st) => (st === stage ? ss : u.steps.filter((s) => s.stage === st))) }
        })
      )
      setDirty()
    },
    [activeIdx, setDirty]
  )

  const addStep = useCallback(
    (stage: string) => {
      const s: Step = {
        id: uid(),
        stage,
        title: "New step",
        type: "Core",
        delivery: "Guided session",
        description: "",
        dependencies: [],
        effortBD: null,
        effortCustomer: null,
        hasExistingContent: false,
        existingContentLink: null,
      }
      setUsecases((prev) => prev.map((u, i) => (i !== activeIdx ? u : { ...u, steps: [...u.steps, s] })))
      setDirty()
    },
    [activeIdx, setDirty]
  )

  const addUC = useCallback(() => {
    const n: Usecase = { id: uid(), name: "New use case", colorIdx: usecases.length % UC_COLORS.length, steps: [] }
    setUsecases((prev) => [...prev, n])
    setActiveIdx(usecases.length)
    setDirty()
  }, [usecases.length, setDirty])

  const deleteUC = useCallback(() => {
    if (usecases.length <= 1) return
    const delId = usecases[activeIdx].id
    setUsecases((prev) =>
      prev
        .filter((_, i) => i !== activeIdx)
        .map((u) => ({
          ...u,
          steps: u.steps.map((s) => ({ ...s, dependencies: s.dependencies.filter((d) => d.ucId !== delId) })),
        }))
    )
    setActiveIdx(Math.max(0, activeIdx - 1))
    setDirty()
  }, [activeIdx, usecases.length, setDirty])

  const exportJSON = useCallback(() => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([JSON.stringify(usecases, null, 2)], { type: "application/json" }))
    a.download = "bluedolphin_usecases.json"
    a.click()
    flash("Exported")
  }, [usecases, flash])

  const importJSON = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (!f) return
      const r = new FileReader()
      r.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string)
          setUsecases(parsed)
          setDirty()
          flash("Imported")
        } catch {
          flash("Invalid JSON")
        }
      }
      r.readAsText(f)
      e.target.value = ""
    },
    [setDirty, flash]
  )

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="40vh">
        <Spinner size="lg" />
      </Box>
    )
  }

  const uc = usecases[activeIdx]
  const col = UC_COLORS[(uc?.colorIdx ?? 0) % UC_COLORS.length]

  return (
    <Box fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" fontSize={14} color="#1a1a18" py={2}>
      {toast && (
        <Box position="fixed" top={14} right={14} bg="#1a1a18" color="#fff" fontSize={12} px={4} py={2} rounded={8} zIndex={9999} pointerEvents="none">
          {toast}
        </Box>
      )}

      {saving && (
        <Box position="fixed" top={14} left="50%" transform="translateX(-50%)" bg="white" border="1px solid rgba(0,0,0,0.1)" px={4} py={2} rounded={8} zIndex={9999} display="flex" alignItems="center" gap={2}>
          <Spinner size="sm" />
          <Text fontSize={12}>Saving…</Text>
        </Box>
      )}

      {conflict && (
        <Box position="fixed" inset={0} bg="rgba(0,0,0,0.35)" zIndex={50} display="flex" alignItems="center" justifyContent="center">
          <Box bg="white" rounded={12} p={6} maxW="480px" width="90%" boxShadow="lg">
            <Text fontSize={16} fontWeight={600} mb={2}>Save conflict</Text>
            <Text fontSize={13} color="gray.600" mb={4} lineHeight={1.6}>
              Someone else committed a change to the GitHub repo since you loaded this page.
              Reload to get their latest version (your unsaved edits will be lost), or overwrite
              the repo with your current version.
            </Text>
            <HStack gap={3} justify="flex-end">
              <Button variant="ghost" size="sm" onClick={reloadFromGithub}>
                Reload latest
              </Button>
              <Button size="sm" colorPalette="blue" onClick={overwriteWithMine}>
                Overwrite with mine
              </Button>
            </HStack>
          </Box>
        </Box>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Text fontSize={11} color="gray.500" mb={0.5}>BlueDolphin · Onboarding 2.0</Text>
          <Text fontSize={18} fontWeight={500}>Use case editor</Text>
          {lastCommitUrl && (
            <Text fontSize={10} mt={0.5}>
              <a href={lastCommitUrl} target="_blank" rel="noreferrer" style={{ color: "#378ADD" }}>
                View last commit on GitHub ↗
              </a>
            </Text>
          )}
        </Box>
        <HStack gap={3}>
          <Button as="label" size="xs" variant="outline" rounded={20} cursor="pointer">
            Import JSON
            <input type="file" accept=".json" onChange={importJSON} style={{ display: "none" }} />
          </Button>
          <Button size="xs" variant="outline" rounded={20} onClick={exportJSON}>
            Export JSON
          </Button>
          <Button size="xs" colorPalette={dirty ? "blue" : "gray"} variant={dirty ? "solid" : "outline"} onClick={() => saveRemote(usecases)} disabled={saving}>
            {saving ? "Saving…" : "Save to repo"}
          </Button>
        </HStack>
      </Box>

      <HStack gap={1.5} flexWrap="wrap" mb={4}>
        {usecases.map((u, i) => {
          const c = UC_COLORS[u.colorIdx % UC_COLORS.length]
          return (
            <Button
              key={u.id}
              onClick={() => setActiveIdx(i)}
              size="xs"
              rounded={20}
              fontWeight={500}
              bg={i === activeIdx ? c.bg : "transparent"}
              color={i === activeIdx ? c.text : "gray.600"}
              border={i === activeIdx ? `1.5px solid ${c.border}` : "1px solid rgba(0,0,0,0.14)"}
              _hover={{ opacity: 0.85 }}
            >
              {u.name}
            </Button>
          )
        })}
        <Button size="xs" rounded={20} variant="outline" borderStyle="dashed" color="gray.500" onClick={addUC}>
          + Add use case
        </Button>
      </HStack>

      {uc && (
        <Box display="flex" alignItems="center" gap={3} mb={3.5} p={3} bg={col.bg} rounded={12}>
          {editingName ? (
            <input
              autoFocus
              defaultValue={uc.name}
              onBlur={(e) => {
                setUsecases((prev) => prev.map((u, i) => (i === activeIdx ? { ...u, name: e.target.value } : u)))
                setEditingName(false)
                setDirty()
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              style={{ fontSize: 16, fontWeight: 500, background: "transparent", border: "none", borderBottom: `1.5px solid ${col.border}`, outline: "none", color: col.text, minWidth: 180 }}
            />
          ) : (
            <Text as="h2" fontSize={16} fontWeight={500} color={col.text} cursor="pointer" m={0} onClick={() => setEditingName(true)}>
              {uc.name} <Text as="span" fontSize={11} opacity={0.45}>✏</Text>
            </Text>
          )}
          <HStack ml="auto" gap={3} fontSize={11} color={col.text} opacity={0.75}>
            {STAGES.map((s) => (
              <Text key={s}>
                {s}: <Text as="span" fontWeight={700}>{uc.steps.filter((st) => st.stage === s).length}</Text>
              </Text>
            ))}
            <Text>
              Total: <Text as="span" fontWeight={700}>{uc.steps.length}</Text>
            </Text>
          </HStack>
          {usecases.length > 1 && (
            <Button size="xs" color="red.700" bg="red.50" border="0.5px solid rgba(153,27,27,0.25)" onClick={deleteUC}>
              Delete use case
            </Button>
          )}
          <Button size="xs" variant="ghost" color={col.text} opacity={0.7} fontSize={10} onClick={() => setEditingStages((v) => !v)}>
            {editingStages ? "Hide stage descriptions" : "Edit stage descriptions"}
          </Button>
        </Box>
      )}

      {uc && editingStages && (
        <Box mb={3} p={3} bg="rgba(0,0,0,0.02)" rounded={10} border="0.5px solid rgba(0,0,0,0.07)">
          <Text fontSize={11} fontWeight={500} color="gray.600" mb={2}>Customize stage descriptions for this use case</Text>
          <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2}>
            {STAGES.map((s) => {
              const stageCol = STAGE_COLORS[s]
              return (
                <Box key={s}>
                  <Text fontSize={10} fontWeight={500} color={stageCol.text} mb={0.5}>{s}</Text>
                  <textarea
                    defaultValue={uc.stageDescriptions?.[s] ?? STAGE_DESC[s]}
                    onBlur={(e) => {
                      const newVal = e.target.value
                      setUsecases((prev) =>
                        prev.map((u, i) =>
                          i === activeIdx
                            ? { ...u, stageDescriptions: { ...u.stageDescriptions, [s]: newVal } }
                            : u
                        )
                      )
                      setDirty()
                    }}
                    rows={2}
                    style={{
                      fontSize: 10,
                      width: "100%",
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: `0.5px solid ${stageCol.border}`,
                      background: "transparent",
                      color: stageCol.border,
                      resize: "vertical",
                      lineHeight: 1.4,
                    }}
                  />
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      <Box display="grid" gridTemplateColumns="repeat(3, minmax(0, 1fr))" gap={3}>
        {STAGES.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            stageDescription={uc?.stageDescriptions?.[stage] ?? STAGE_DESC[stage]}
            steps={uc?.steps ?? []}
            usecases={usecases}
            currentUcId={uc?.id ?? ""}
            onUpdateStep={(id, ch) => updateStep(id, ch)}
            onDeleteStep={deleteStep}
            onMoveStep={moveStep}
            onAddStep={addStep}
          />
        ))}
      </Box>

      <Box mt={4} p={3} bg="rgba(0,0,0,0.02)" rounded={10} border="0.5px solid rgba(0,0,0,0.07)" fontSize={11} color="gray.500" lineHeight={1.6}>
        <Text as="b" color="gray.600">How to use:</Text> Click any step to expand and edit. Change Stage to move it between columns. Use ↑↓ to reorder. Dependencies pick a step from another use case. Set BD1–5 and C1–5 for effort. Click Save to commit your changes to the GitHub repository. If someone else committed first, you'll be asked to reload their version or overwrite it.
      </Box>
    </Box>
  )
}

function StageColumn({
  stage,
  stageDescription,
  steps,
  usecases,
  currentUcId,
  onUpdateStep,
  onDeleteStep,
  onMoveStep,
  onAddStep,
}: {
  stage: string
  stageDescription: string
  steps: Step[]
  usecases: Usecase[]
  currentUcId: string
  onUpdateStep: (id: string, ch: Partial<Step>) => void
  onDeleteStep: (id: string) => void
  onMoveStep: (id: string, stage: string, dir: "up" | "down") => void
  onAddStep: (stage: string) => void
}) {
  const col = STAGE_COLORS[stage]
  const stageSteps = steps.filter((s) => s.stage === stage)
  return (
    <Box border="0.5px solid rgba(0,0,0,0.1)" rounded={12} overflow="hidden" display="flex" flexDirection="column">
      <Box p={2} pb={1.5} borderBottom="0.5px solid rgba(0,0,0,0.07)" bg={col.bg}>
        <Text fontSize={12} fontWeight={500} color={col.text}>
          {stage}
        </Text>
        <Text fontSize={10} color={col.border} mt={0.5}>
          {stageDescription}
        </Text>
        <Text fontSize={10} color={col.border} opacity={0.65} mt={0.5}>
          {stageSteps.length} step{stageSteps.length !== 1 ? "s" : ""}
        </Text>
      </Box>
      <Box p={1.5} flex={1} display="flex" flexDirection="column" gap={1}>
        {stageSteps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            usecases={usecases}
            currentUcId={currentUcId}
            stageSteps={stageSteps}
            onUpdate={(ch) => onUpdateStep(step.id, ch)}
            onDelete={() => onDeleteStep(step.id)}
            onMove={(d) => onMoveStep(step.id, stage, d)}
          />
        ))}
        <Button
          onClick={() => onAddStep(stage)}
          mt={0.5}
          fontSize={11}
          py={1}
          rounded={6}
          border={`1px dashed ${col.border}`}
          bg="transparent"
          color={col.text}
          variant="outline"
        >
          + Add step
        </Button>
      </Box>
    </Box>
  )
}

function StepCard({
  step,
  usecases,
  currentUcId,
  stageSteps,
  onUpdate,
  onDelete,
  onMove,
}: {
  step: Step
  usecases: Usecase[]
  currentUcId: string
  stageSteps: Step[]
  onUpdate: (ch: Partial<Step>) => void
  onDelete: () => void
  onMove: (dir: "up" | "down") => void
}) {
  const [open, setOpen] = useState(false)
  const idx = stageSteps.findIndex((s) => s.id === step.id)
  const tc = TYPE_COLORS[step.type]

  return (
    <Box
      border={`0.5px solid ${step.type === "Contextual" ? "#BA7517" : step.type === "Cross-cutting" ? "#7F77DD" : "rgba(0,0,0,0.12)"}`}
      borderStyle={step.type === "Contextual" ? "dashed" : "solid"}
      rounded={8}
      bg={step.type === "Cross-cutting" ? "rgba(127,119,221,0.05)" : "white"}
      overflow="hidden"
    >
      <Box
        display="flex"
        alignItems="flex-start"
        gap={1}
        p={1.5}
        cursor="pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <Text fontSize={9} color="gray.400" minW={3.5} pt={0.5} fontWeight={600} flexShrink={0}>
          {step.type === "Cross-cutting" ? "—" : idx + 1}
        </Text>
        <Text flex={1} fontSize={11} fontWeight={500} lineHeight={1.35}>
          {step.title}
        </Text>
        <HStack gap={1} flexShrink={0}>
          <Text fontSize={9} fontWeight={500} px={1} py={0.5} rounded={10} bg={tc.bg} color={tc.text}>
            {step.type}
          </Text>
          <Box w={1.5} h={1.5} rounded="full" bg={DELIVERY_DOT[step.delivery]} />
          {step.dependencies.length > 0 && (
            <Text fontSize={9} px={1} py={0.5} rounded={10} bg="#F1EFE8" color="#5F5E5A">
              {step.dependencies.length}🔗
            </Text>
          )}
          {step.hasExistingContent && step.existingContentLink && (
            <a
              href={step.existingContentLink}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={step.existingContentLink}
              style={{ fontSize: 9, padding: "2px 4px", borderRadius: 10, background: "#E6F1FB", color: "#0C447C", textDecoration: "none" }}
            >
              🔗 link
            </a>
          )}
          {(step.effortBD != null || step.effortCustomer != null) && (
            <HStack gap={0.5}>
              {step.effortBD != null && (
                <Text fontSize={9} fontWeight={600} px={1} py={0.5} rounded={6} bg="#E6F1FB" color="#0C447C" lineHeight={1.4}>
                  BD{step.effortBD}
                </Text>
              )}
              {step.effortCustomer != null && (
                <Text fontSize={9} fontWeight={600} px={1} py={0.5} rounded={6} bg="#FAEEDA" color="#633806" lineHeight={1.4}>
                  C{step.effortCustomer}
                </Text>
              )}
            </HStack>
          )}
          <Text fontSize={9} color="gray.300" display="inline-block" transform={open ? "rotate(90deg)" : "none"} transition="transform .12s">
            ▶
          </Text>
        </HStack>
      </Box>

      {open && (
        <Box px={2} pb={2.5} pl={7} borderTop="0.5px solid rgba(0,0,0,0.07)" onClick={(e) => e.stopPropagation()}>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mt={2}>
            <Box style={lbl} gridColumn="1 / -1">
              <Text fontSize={10} color="gray.500">Title</Text>
              <input
                defaultValue={step.title}
                onBlur={(e) => onUpdate({ title: e.target.value })}
                style={inp}
              />
            </Box>
            <Box style={lbl}>
              <Text fontSize={10} color="gray.500">Stage</Text>
              <select value={step.stage} onChange={(e) => onUpdate({ stage: e.target.value })} style={inp}>
                {STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Box>
            <Box style={lbl}>
              <Text fontSize={10} color="gray.500">Type</Text>
              <select value={step.type} onChange={(e) => onUpdate({ type: e.target.value })} style={inp}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Box>
            <Box style={lbl} gridColumn="1 / -1">
              <Text fontSize={10} color="gray.500">Delivery</Text>
              <Box display="flex" gap={2}>
                {DELIVERY.map((d) => (
                  <label key={d} style={{ display: "flex", alignItems: "center", gap: 1, fontSize: 12, cursor: "pointer" }}>
                    <input type="radio" name={`del-${step.id}`} value={d} checked={step.delivery === d} onChange={() => onUpdate({ delivery: d })} />
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box w={1.5} h={1.5} rounded="full" bg={DELIVERY_DOT[d]} />
                      {d}
                    </Box>
                  </label>
                ))}
              </Box>
            </Box>
            <Box style={lbl}>
              <Text fontSize={10} color="gray.500">BlueDolphin effort</Text>
              <Box display="flex" gap={1} mt={0.5}>
                {[null, 1, 2, 3, 4, 5].map((v) => (
                  <Button
                    key={v ?? "none"}
                    onClick={() => onUpdate({ effortBD: v })}
                    size="xs"
                    fontSize={11}
                    fontWeight={500}
                    w={7}
                    h={6}
                    rounded={6}
                    border="0.5px solid rgba(0,0,0,0.18)"
                    bg={step.effortBD === v ? "#E6F1FB" : "transparent"}
                    color={step.effortBD === v ? "#0C447C" : "gray.500"}
                    _hover={{ opacity: 0.85 }}
                  >
                    {v ?? "–"}
                  </Button>
                ))}
              </Box>
            </Box>
            <Box style={lbl}>
              <Text fontSize={10} color="gray.500">Customer effort</Text>
              <Box display="flex" gap={1} mt={0.5}>
                {[null, 1, 2, 3, 4, 5].map((v) => (
                  <Button
                    key={v ?? "none"}
                    onClick={() => onUpdate({ effortCustomer: v })}
                    size="xs"
                    fontSize={11}
                    fontWeight={500}
                    w={7}
                    h={6}
                    rounded={6}
                    border="0.5px solid rgba(0,0,0,0.18)"
                    bg={step.effortCustomer === v ? "#FAEEDA" : "transparent"}
                    color={step.effortCustomer === v ? "#633806" : "gray.500"}
                    _hover={{ opacity: 0.85 }}
                  >
                    {v ?? "–"}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>

          <Box style={lbl} mt={2}>
            <Text fontSize={10} color="gray.500">Description</Text>
            <textarea
              defaultValue={step.description}
              onBlur={(e) => onUpdate({ description: e.target.value })}
              rows={3}
              style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
            />
          </Box>

          <Box mt={2.5}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer", color: "#555" }}>
              <input
                type="checkbox"
                checked={!!step.hasExistingContent}
                onChange={(e) => onUpdate({ hasExistingContent: e.target.checked })}
              />
              Has existing content/defined service
            </label>
            {step.hasExistingContent && (
              <Box mt={1.5}>
                <Text fontSize={10} color="gray.500" mb={0.5}>Link to existing content/service</Text>
                <input
                  type="url"
                  placeholder="https://…"
                  defaultValue={step.existingContentLink ?? ""}
                  onBlur={(e) => onUpdate({ existingContentLink: e.target.value || null })}
                  style={inp}
                />
              </Box>
            )}
          </Box>

          <Box mt={2.5}>
            <Text fontSize={10} color="gray.500" mb={1} fontWeight={500}>
              Depends on (step must be completed first)
            </Text>
            <DepPicker
              dependencies={step.dependencies}
              usecases={usecases}
              currentUcId={currentUcId}
              currentStepId={step.id}
              onChange={(deps) => onUpdate({ dependencies: deps })}
            />
          </Box>

          <Box display="flex" gap={1.5} mt={2.5}>
            <Button size="xs" variant="outline" onClick={() => onMove("up")} disabled={idx === 0}>
              ↑ Up
            </Button>
            <Button size="xs" variant="outline" onClick={() => onMove("down")} disabled={idx === stageSteps.length - 1}>
              ↓ Down
            </Button>
            <Button size="xs" color="red.700" bg="red.50" border="0.5px solid rgba(153,27,27,0.2)" ml="auto" onClick={onDelete}>
              Delete
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}

const lbl: React.CSSProperties = { fontSize: 10, color: "#888", display: "flex", flexDirection: "column", gap: 3 }
const inp: React.CSSProperties = { fontSize: 12, padding: "4px 7px", borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.18)", background: "transparent", color: "inherit" }

function DepPicker({
  dependencies,
  usecases,
  currentUcId,
  currentStepId,
  onChange,
}: {
  dependencies: { ucId: string; stepId: string }[]
  usecases: Usecase[]
  currentUcId: string
  currentStepId: string
  onChange: (deps: { ucId: string; stepId: string }[]) => void
}) {
  const [selUcId, setSelUcId] = useState("")
  const [selStepId, setSelStepId] = useState("")

  const otherUCs = usecases.filter((u) => u.id !== currentUcId)
  const selUC = usecases.find((u) => u.id === selUcId)
  const available = selUC
    ? selUC.steps.filter((s) => s.id !== currentStepId && !dependencies.some((d) => d.stepId === s.id))
    : []

  const add = () => {
    if (!selUcId || !selStepId) return
    onChange([...dependencies, { ucId: selUcId, stepId: selStepId }])
    setSelStepId("")
  }

  return (
    <Box>
      {dependencies.length > 0 && (
        <VStack gap={0.5} mb={1.5} align="stretch">
          {dependencies.map((dep) => {
            const info = lookupStep(usecases, dep.ucId, dep.stepId)
            return (
              <Box key={dep.stepId} display="flex" alignItems="center" gap={1.5} p={1} bg="rgba(0,0,0,0.03)" rounded={6} fontSize={11}>
                {info ? (
                  <Box flex={1}>
                    <Text as="span" fontSize={10} color="gray.400">
                      {info.ucName} · {info.stage} →
                    </Text>{" "}
                    <Text as="span" color="gray.800">
                      {info.stepTitle}
                    </Text>
                  </Box>
                ) : (
                  <Text flex={1} color="gray.300" fontStyle="italic">
                    deleted step
                  </Text>
                )}
                <Button
                  size="2xs"
                  variant="ghost"
                  color="red.700"
                  onClick={() => onChange(dependencies.filter((d) => d.stepId !== dep.stepId))}
                >
                  ✕
                </Button>
              </Box>
            )
          })}
        </VStack>
      )}

      <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
        <select
          value={selUcId}
          onChange={(e) => {
            setSelUcId(e.target.value)
            setSelStepId("")
          }}
          style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.18)", background: "transparent", color: "inherit", flex: "1 1 110px", minWidth: 110 }}
        >
          <option value="">Use case…</option>
          {otherUCs.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <select
          value={selStepId}
          onChange={(e) => setSelStepId(e.target.value)}
          disabled={!selUcId}
          style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.18)", background: "transparent", color: "inherit", flex: "2 1 150px", minWidth: 150, opacity: selUcId ? 1 : 0.38 }}
        >
          <option value="">Step…</option>
          {STAGES.map((st) => {
            const grp = available.filter((s) => s.stage === st)
            return grp.length > 0 ? (
              <optgroup key={st} label={st}>
                {grp.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            ) : null
          })}
        </select>

        <Button size="xs" variant="outline" onClick={add} disabled={!selUcId || !selStepId}>
          + Add
        </Button>
      </Box>

      {dependencies.length === 0 && (
        <Text fontSize={10} color="gray.300" mt={1}>
          No dependencies — this step is always applicable.
        </Text>
      )}
    </Box>
  )
}
