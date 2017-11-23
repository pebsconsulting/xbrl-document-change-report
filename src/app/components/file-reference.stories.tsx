/*
 *  Copyright 2017 CoreFiling S.A.R.L.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import * as React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import FileReference from './file-reference';

const file = (name?: string, size: number = 1024 * 20, type?: string): File => {
  return {
    name,
    size,
    type,
  } as any;
};

storiesOf('FileReference', module)
  .addDecorator(story => <div style={{
      margin: '1em auto', padding: '20px', maxWidth: '400px',
      color: 'rgba(0, 0, 0, .86)', background: '#F7F7F7',
  }}>
    {story()}
  </div>)
  .add('Old', () => <FileReference type='OLD' file={file('oldman.xbrl', 666, 'application/xml')}/>)
  .add('New', () => <FileReference type='NEW' file={file('newman.xbrl', 666, 'application/xml')}/>)
  .add('Bytes', () => <FileReference type='OLD' file={file('Best Soufflé Company 2017.xml', 69, 'application/xml')}/>)
  .add('Kilobytes', () => <FileReference type='OLD' file={file('Amalagmated Holdings (Group).xml', 42 * 1024, 'application/xml')}/>)
  .add('Megabytes', () => <FileReference type='OLD' file={file('accts.xml', 13 * 1024 * 1024, 'application/xml')}/>)
  .add('Longer name', () => <FileReference type='OLD' file={
    file('United Frog Hunters Group (Holdings) Ltd annual accounts FINAL rev 4.zip', 77 * 1024)}/>)
  .add('Removable', () => <FileReference
    type='OLD'
    file={file('Amalagmated Holdings (Group).xml', 42 * 1024, 'application/xml')}
    onRemove={action('onRemove')}/>);
