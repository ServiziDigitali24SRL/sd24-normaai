import { AgentMap } from './components/AgentMap';
import { HeroBar } from './components/HeroBar';
import { HeroHeadline } from './components/HeroHeadline';
import { VotiList } from './components/VotiList';

export default function ComeHoCostruitoNormaPage() {
  return (
    <>
      <HeroBar />
      <main>
        <HeroHeadline />
        <VotiList />
        <AgentMap />
      </main>
    </>
  );
}
