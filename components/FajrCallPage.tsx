import React from 'react';
import type { User } from 'firebase/auth';
import FajrWakePanel from '../src/components/FajrWakePanel';
const FajrCallPage: React.FC<{user:User}> = () => <FajrWakePanel />;
export default FajrCallPage;
