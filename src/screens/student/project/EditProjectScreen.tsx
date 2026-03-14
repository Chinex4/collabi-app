import React from 'react';

import { ProjectFormScreen } from './shared';

export const EditProjectScreen = ({ navigation, route }: any) => (
  <ProjectFormScreen navigation={navigation} projectId={route.params.projectId} />
);
