const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

function createRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('Upload route wiring', () => {
  it('requires authenticateToken before uploadController.uploadFile', () => {
    const router = require('../routes/upload');
    const { authenticateToken } = require('../middleware/authenticateToken');
    const uploadController = require('../controller/uploadController');

    const postLayer = router.stack.find(
      (layer) => layer.route && layer.route.path === '/' && layer.route.methods.post
    );

    expect(postLayer, 'POST / route not found on upload router').to.exist;

    const handlers = postLayer.route.stack.map((l) => l.handle);

    const authIndex = handlers.indexOf(authenticateToken);
    const uploadIndex = handlers.indexOf(uploadController.uploadFile);

    expect(authIndex, 'authenticateToken middleware is missing from the upload route').to.be.at.least(0);
    expect(uploadIndex, 'uploadController.uploadFile is missing from the upload route').to.be.at.least(0);
    expect(authIndex).to.be.lessThan(uploadIndex);
  });
});

describe('uploadController.uploadFile', () => {
  let uploadController;
  let supabaseStub;
  let fileTypeFromBufferStub;
  let insertStub;

  function buildSupabaseStub({ uploadError = null, urlError = null, insertError = null } = {}) {
    insertStub = sinon.stub().resolves({ error: insertError });

    return {
      storage: {
        from: sinon.stub().returns({
          upload: sinon.stub().resolves({ error: uploadError }),
          getPublicUrl: sinon.stub().returns({
            data: urlError ? null : { publicUrl: 'https://storage.example.com/files/1/abc.png' },
            error: urlError,
          }),
        }),
      },
      from: sinon.stub().returns({
        insert: insertStub,
      }),
    };
  }

  function loadControllerWith(supabaseOverride, fileTypeResult) {
    supabaseStub = supabaseOverride;
    fileTypeFromBufferStub = sinon.stub().resolves(fileTypeResult);

    function multerStub() {
      return { single: () => (req, res, cb) => cb(null) };
    }
    multerStub.memoryStorage = () => ({});

    return proxyquire('../controller/uploadController', {
      '../services/supabaseClient': { supabaseService: supabaseStub },
      'file-type': { fileTypeFromBuffer: fileTypeFromBufferStub },
      '../utils/logger': { info: sinon.stub(), warn: sinon.stub(), error: sinon.stub() },
      multer: multerStub,
    });
  }

  function buildReq({ userId = 1, fileBuffer = Buffer.from('fake-image-bytes'), mimetype = 'image/png', bodyUserId } = {}) {
    return {
      user: { userId },
      ip: '127.0.0.1',
      headers: {},
      body: bodyUserId !== undefined ? { user_id: bodyUserId } : {},
      file: {
        originalname: 'resume.pdf',
        buffer: fileBuffer,
        mimetype,
        size: fileBuffer.length,
      },
    };
  }

  afterEach(() => {
    sinon.restore();
  });

  it('uses the authenticated user\'s ID, not a client-supplied user_id, for the storage path', async () => {
    const supabase = buildSupabaseStub();
    uploadController = loadControllerWith(supabase, { mime: 'application/pdf' });

    const req = buildReq({ userId: 7, mimetype: 'application/pdf', bodyUserId: 123456 });
    const res = createRes();

    await uploadController.uploadFile(req, res);

    expect(res.statusCode).to.equal(201);
    expect(res.body.success).to.equal(true);

    const uploadCall = supabase.storage.from().upload;
    const storedPath = uploadCall.getCall(0).args[0];

    expect(storedPath).to.include('files/7/');
    expect(storedPath).to.not.include('123456');
  });

  it('rejects a file whose real content does not match its declared mimetype', async () => {
    const supabase = buildSupabaseStub();
    uploadController = loadControllerWith(supabase, { mime: 'application/pdf' });

    const req = buildReq({ mimetype: 'image/png' });
    const res = createRes();

    await uploadController.uploadFile(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.success).to.equal(false);
    expect(res.body.error).to.match(/does not match actual file content/i);

    expect(insertStub.called).to.equal(true);
    const loggedRow = insertStub.getCall(0).args[0][0];
    expect(loggedRow.status).to.equal('rejected_type');
  });

  it('rejects a file whose content does not match any allowed type at all', async () => {
    const supabase = buildSupabaseStub();
    uploadController = loadControllerWith(supabase, null);

    const req = buildReq({ mimetype: 'image/png' });
    const res = createRes();

    await uploadController.uploadFile(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.error).to.match(/does not match an allowed file type/i);
  });

  it('returns 201 and a fileUrl on a genuinely valid upload, and logs a success audit row', async () => {
    const supabase = buildSupabaseStub();
    uploadController = loadControllerWith(supabase, { mime: 'image/png' });

    const req = buildReq({ userId: 42, mimetype: 'image/png' });
    const res = createRes();

    await uploadController.uploadFile(req, res);

    expect(res.statusCode).to.equal(201);
    expect(res.body.success).to.equal(true);
    expect(res.body.fileUrl).to.be.a('string');

    expect(insertStub.called).to.equal(true);
    const loggedRow = insertStub.getCall(0).args[0][0];
    expect(loggedRow.status).to.equal('success');
    expect(loggedRow.user_id).to.equal(42);
    expect(loggedRow.original_filename).to.equal('resume.pdf');
  });

  it('still returns the upload result even if the audit log write itself fails', async () => {
    const supabase = buildSupabaseStub({ insertError: { message: 'db unavailable' } });
    uploadController = loadControllerWith(supabase, { mime: 'image/png' });

    const req = buildReq({ mimetype: 'image/png' });
    const res = createRes();

    await uploadController.uploadFile(req, res);

    expect(res.statusCode).to.equal(201);
    expect(res.body.success).to.equal(true);
  });

  it('returns 500 and logs an error row if the storage upload itself fails', async () => {
    const supabase = buildSupabaseStub({ uploadError: { message: 'bucket unreachable' } });
    uploadController = loadControllerWith(supabase, { mime: 'image/png' });

    const req = buildReq({ mimetype: 'image/png' });
    const res = createRes();

    await uploadController.uploadFile(req, res);

    expect(res.statusCode).to.equal(500);
    expect(res.body.success).to.equal(false);

    const loggedRow = insertStub.getCall(0).args[0][0];
    expect(loggedRow.status).to.equal('error');
    expect(loggedRow.error_reason).to.match(/bucket unreachable/);
  });
});