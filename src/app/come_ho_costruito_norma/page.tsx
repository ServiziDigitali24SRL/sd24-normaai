import { AgentMap } from './components/AgentMap';
import { FunnelCorpus } from './components/FunnelCorpus';
import { GpuLive } from './components/GpuLive';
import { HeroBar } from './components/HeroBar';
import { HeroHeadline } from './components/HeroHeadline';
import { LiveEventStream } from './components/LiveEventStream';
import { SourceCoverage } from './components/SourceCoverage';
import { VotiList } from './components/VotiList';

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
      </main>
    </>
  );
}
