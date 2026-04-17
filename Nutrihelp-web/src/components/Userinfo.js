import React from 'react';
import '../styles/userinfo.css';

function UserInfo() {
  return (
    <><div class="page-wrapper bg-red p-t-30 p-b-30 font-robo">
      <div class="wrapper wrapper--w960">
        <div class="card card-2">
          <div class="card-heading"></div>
          <div class="card-body">
            <h2 class="title">Profile</h2>
            <form method="POST">
              <div class="input-group">
                <input class="input--style-2" type="text" placeholder="Name" name="name" />
              </div>
              <div class="input-group">
                <input class="input--style-2" type="text" placeholder="Surname" name="Surname" />
              </div>

              <div class="input-group">
                <input class="input--style-2" type="text" placeholder="Age (In years)" name="Age" />
              </div>

              <div class="row row-space">
                <div class="col-2">
                  <div class="input-group">
                    <input class="input--style-2" type="text" placeholder="Birthdate" name="birthday" />
                    
                  </div>
                </div>
                <div class="col-2">
                  <div class="input-group">
                    <div class="rs-select2 js-select-simple select--no-search">
                      <select name="gender">
                        <option disabled="disabled" selected="selected">Gender</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                      <div class="select-dropdown"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="row row-space">
                <div class="col-2">
                  <div class="input-group">
                    <input class="input--style-2" type="text" placeholder="Weight (in Kgs)" name="weight" />
                  </div>
                </div>
              </div>
              <div class="row row-space">
                <div class="col-2">
                  <div class="input-group">
                    <input class="input--style-2" type="text" placeholder="Height (in cms)" name="height" />
                  </div>
                </div>
              </div>
              <div class="p-t-30">
                <button class="btn btn--radius btn--green" type="submit">Submit</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    </>
)}

export default UserInfo;
