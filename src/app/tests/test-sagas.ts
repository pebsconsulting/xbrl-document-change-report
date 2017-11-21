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

import {} from 'jasmine';
import { delay } from 'redux-saga';
import { all, call, put } from 'redux-saga/effects';

import { startupInfoReceivedAction, startupInfoFailedAction,
  processingStartAction, uploadStartedAction, uploadFailedAction,
  processingStartedAction, failedAction } from '../actions';
import { profilesApi, uploadApi } from '../apis';
import { apiFetchJson } from '../api-fetch';
import { JobParams,  } from '../models';
import { startupInfoSaga, processingStartSaga } from '../sagas';
import { exampleUser, exampleApps, exampleProfiles, exampleFiling, exampleComparisonSummary } from './model-examples';

describe('startupInfoSaga', () => {
  it('calls APIs in parallel and dispatches profiles', () => {
    const saga = startupInfoSaga();

    expect(saga.next().value).toEqual(all([
      call(apiFetchJson, '/api/user'),
      call([profilesApi, profilesApi.getProfiles]),
      call(apiFetchJson, '/api/apps'),
    ]));
    expect(saga.next([exampleUser, exampleProfiles, exampleApps]).value)
      .toEqual(put(startupInfoReceivedAction(exampleUser, exampleApps, exampleProfiles)));
  });

  it('is sad if no profiles', () => {
    const saga = startupInfoSaga();

    saga.next();
    expect(saga.next([{}, [], {}]).value)
    .toEqual(put(startupInfoFailedAction(jasmine.stringMatching(/No profiles/) as any)));
  });

  it('is sad if error fetching profiles', () => {
    const saga = startupInfoSaga();

    saga.next();
    expect(saga.throw && saga.throw({status: 403, statusText: 'LOLWAT'}).value)
    .toEqual(put(startupInfoFailedAction(jasmine.stringMatching(/LOLWAT/) as any)));
  });
});

describe('processingStartSaga', () => {

  const file1 = new File(['Hello, world!'], 'a-file.txt', {type: 'text/plain'});
  const file2 = new File(['hello world'], 'another-file.txt', {type: 'text/plain'});
  const params: JobParams = {
    profile: 'uiid-of-profile',
    file1,
    file2,
};

  it('dispatches PROCESSING_STARTED and TABLES_RECEIVED if all goes well', () => {
    const saga = processingStartSaga(processingStartAction(params));

    expect(saga.next().value).toEqual(put(uploadStartedAction(params)));
    const formData = new FormData();
    // dataSet omitted on the assumption iot defaults to user’s only permitrted dataset.
    formData.append('validationProfile', 'uuid-of-profile');
    formData.append('name', 'a-file.txt');
    formData.append('originalFiling', file1, 'a-file.txt');
    formData.append('newFiling', file2, 'another-file.txt');
    expect(saga.next().value).toEqual(call(apiFetchJson, '/api/table-diff-service/v1/comparisons/', {
      method: 'POST',
      body: formData,  // This test is less strict than it looks because all formData object compare equal.
    }));
    expect(saga.next(exampleFiling).value).toEqual(put(processingStartedAction()));

    // Then poll for updates after 1 second.
    expect(saga.next().value).toEqual(call(delay, 1000));
    expect(saga.next().value).toEqual(call([uploadApi, uploadApi.getComparison], {comparisonId: 'f09be954-1895-4954-b333-6c9c89b833f1'}));
    expect(saga.next({...exampleComparisonSummary, status: 'RUNNING'}).value).toEqual(call(delay, 1000));
    expect(saga.next().value).toEqual(call([uploadApi, uploadApi.getComparison], {comparisonId: 'f09be954-1895-4954-b333-6c9c89b833f1'}));
    // Gets filing-version results, move on to fetching tables.
    expect(saga.next({...exampleComparisonSummary, status: 'DONE'}).value).toEqual(call(
      apiFetchJson,
      '/api/table-rendering-service/v1/filing-versions/f09be954-1895-4954-b333-6c9c89b833f1/tables/'));
  });

  it('dispatches FAILED if initial upload fails', () => {
    const saga = processingStartSaga(processingStartAction(params));

    saga.next(); saga.next();  // First few steps as above.

    expect(saga.throw && saga.throw(new Error('LOLWAT')).value)
    .toEqual(put(uploadFailedAction(jasmine.stringMatching(/LOLWAT/) as any)));
  });

  it('dispatches FAILED if polling fails', () => {
    const saga = processingStartSaga(processingStartAction(params));

    saga.next(); saga.next(); saga.next(exampleFiling); saga.next();  // First few steps as above.

    expect(saga.throw && saga.throw(new Error('LOLWAT')).value).toEqual(put(failedAction('LOLWAT')));
  });

  it('dispatches FAILED if polling fails with response', () => {
    const saga = processingStartSaga(processingStartAction(params));

    saga.next(); saga.next(); saga.next(exampleFiling); saga.next();  // First few steps as above.

    expect(saga.throw && saga.throw({status: 400, statusText: 'Nope.'}).value)
    .toEqual(put(failedAction(jasmine.stringMatching(/Nope./) as any)));
  });
});
