import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';

import {Api, Examples, Checkbox} from './checkbox';

export const ROUTE_DECLARATIONS = [
  Api,
  Examples,
  Checkbox
];

const ROUTES: Routes = [
  {
    path: '', component: Checkbox,
    children: [
      {path: '', redirectTo: 'api'},
      {path: 'api', component: Api},
      {path: 'examples', component: Examples}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(ROUTES)],
  exports: [RouterModule]
})
export class RoutingModule {}
