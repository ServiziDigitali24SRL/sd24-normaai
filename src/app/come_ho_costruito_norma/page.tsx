import { AgentMap } from './components/AgentMap';
import { Architettura } from './components/Architettura';
import { AutopilotADR } from './components/AutopilotADR';
import { FunnelCorpus } from './components/FunnelCorpus';
import { GpuLive } from './components/GpuLive';
import { HeroBar } from './components/HeroBar';
import { HeroHeadline } from './components/HeroHeadline';
import { LiveEventStream } from './components/LiveEventStream';
import { MilestoneTimeline } from './components/MilestoneTimeline';
import { SentinelHealth } from './components/SentinelHealth';
import { SkillsAndDiscovery } from './components/SkillsAndDiscovery';
import { SourceCoverage } from './components/SourceCoverage';
import { VotiList } from './components/VotiList';

// NOTA dynamic loading: le sezioni below-the-fold (§14, §15, §16, §10, §11,
// §12, §13) sono server components puri (no JS interattivo lato client).
// `next/dynamic({ ssr: false })` qui è anti-pattern: produrrebbe FOUC e
// perdita del prerender static senza guadagno di bundle (server components
// non shippano JS al browser). L'unico client component below-fold è
// LiveEventStream §9 — già ottimizzato con requestIdleCallback per il TBT.
// Per ridurre TTI ulteriormente useremmo Suspense streaming ma React 19 +
// Next 16 lo abilitano già di default sul boundary <main>.
export default function ComeHoCostruitoNormaPage() {
  return (
    <>
      <HeroBar />
      <main>
        <HeroHeadline />
        <VotiList />
        <AgentMap />
        <FunnelCorpus />
        <GpuLive />
        <SourceCoverage />
        <LiveEventStream />
        <SentinelHealth />
        <SkillsAndDiscovery />
        <AutopilotADR />
        <MilestoneTimeline />
        <Architettura />
      </main>
    </>
  );
}
