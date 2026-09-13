// © Author:  
// https://discord.gg/wwv



let adminLockEnabled = false;

function isAdminLockEnabled() {
  return adminLockEnabled;
}

function toggleAdminLock() {
  adminLockEnabled = !adminLockEnabled;
  return adminLockEnabled;
}

function setAdminLock(state) {
  adminLockEnabled = state;
  return adminLockEnabled;
}

module.exports = {
  isAdminLockEnabled,
  toggleAdminLock,
  setAdminLock
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */