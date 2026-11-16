import React from 'react';
import type { SimulatorId } from '../../types/radiolab';
import { Lesson01AtomsSim } from './Lesson01AtomsSim';
import { Lesson02OhmBatteriesSim } from './Lesson02OhmBatteriesSim';
import { Lesson03AcWaveSim } from './Lesson03AcWaveSim';
import { Lesson04CapacitorPowerSim } from './Lesson04CapacitorPowerSim';
import { Lesson05InductorSim } from './Lesson05InductorSim';
import { Lesson06SwrImpedanceSim } from './Lesson06SwrImpedanceSim';
import { Lesson07ResonanceSim } from './Lesson07ResonanceSim';
import { Lesson08FiltersDbSim } from './Lesson08FiltersDbSim';
import { Lesson09DiodeTransistorSim } from './Lesson09DiodeTransistorSim';
import { Lesson10ModulationLogicSim } from './Lesson10ModulationLogicSim';
import { Lesson11AntennaSim } from './Lesson11AntennaSim';
import { Lesson12PreExamChallengeSim } from './Lesson12PreExamChallengeSim';

interface SimulatorRouterProps {
  simulatorId: SimulatorId;
  onChallengeComplete?: () => void;
}

export const SimulatorRouter: React.FC<SimulatorRouterProps> = ({
  simulatorId,
  onChallengeComplete,
}) => {
  switch (simulatorId) {
    case 'atoms-flow':
      return <Lesson01AtomsSim onChallengeComplete={onChallengeComplete} />;
    case 'ohm-batteries':
      return <Lesson02OhmBatteriesSim onChallengeComplete={onChallengeComplete} />;
    case 'ac-oscilloscope':
      return <Lesson03AcWaveSim onChallengeComplete={onChallengeComplete} />;
    case 'capacitor-power':
      return <Lesson04CapacitorPowerSim onChallengeComplete={onChallengeComplete} />;
    case 'inductor-magnet':
      return <Lesson05InductorSim onChallengeComplete={onChallengeComplete} />;
    case 'swr-impedance':
      return <Lesson06SwrImpedanceSim onChallengeComplete={onChallengeComplete} />;
    case 'rlc-resonance':
      return <Lesson07ResonanceSim onChallengeComplete={onChallengeComplete} />;
    case 'filters-db':
      return <Lesson08FiltersDbSim onChallengeComplete={onChallengeComplete} />;
    case 'diode-transistor':
      return <Lesson09DiodeTransistorSim onChallengeComplete={onChallengeComplete} />;
    case 'modulation-logic':
      return <Lesson10ModulationLogicSim onChallengeComplete={onChallengeComplete} />;
    case 'antenna-field':
      return <Lesson11AntennaSim onChallengeComplete={onChallengeComplete} />;
    case 'pre-exam-calc':
      return <Lesson12PreExamChallengeSim onChallengeComplete={onChallengeComplete} />;
  }
};
