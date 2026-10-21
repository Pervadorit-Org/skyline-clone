'use strict';

const express = require('express');
const win568CallbackController = require('../controllers/win568Callback.controller');

const router = express.Router();

/**
 * Domain-root wallet callbacks.
 * 568Win: /GetBalance /Deduct /Settle /Rollback /Cancel ...
 */

function postBoth(path, handler) {
  router.post(path, handler);
  const lower = path.toLowerCase();
  if (lower !== path) router.post(lower, handler);
}

postBoth('/GetBalance', win568CallbackController.getBalance);

postBoth('/Deduct', win568CallbackController.deduct);
postBoth('/Settle', win568CallbackController.settle);
postBoth('/Rollback', win568CallbackController.rollback);
postBoth('/Cancel', win568CallbackController.cancel);
postBoth('/ReturnStake', win568CallbackController.returnStake);
postBoth('/GetBetStatus', win568CallbackController.getBetStatus);
postBoth('/Bonus', win568CallbackController.bonus);
postBoth('/Tip', win568CallbackController.tip);
postBoth('/liveCoinTransaction', win568CallbackController.liveCoin);
postBoth('/Transfer', win568CallbackController.transfer);
postBoth('/RollbackTransfer', win568CallbackController.rollbackTransfer);
postBoth('/GetTransferStatus', win568CallbackController.getTransferStatus);

module.exports = router;
