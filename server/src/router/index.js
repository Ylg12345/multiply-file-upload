const express = require('express');
const path = require('path');
const fse = require('fs-extra');
const multiparty = require('multiparty');
const router = express.Router();

const DirName = path.resolve(path.dirname(''));
const UPLOAD_FILES_DIR = path.resolve(DirName, './filelist');

const getUploadedChunkList = async (fileHash) => {
  const isExist = fse.existsSync(path.resolve(UPLOAD_FILES_DIR, fileHash))
  if (isExist) {
    return await fse.readdir(path.resolve(UPLOAD_FILES_DIR, fileHash))
  }
  return []
};

const pipeStream = (path, writeStream) => {
  return new Promise(resolve => {
    const readStream = fse.createReadStream(path);
    readStream.on('end', () => {
      fse.unlinkSync(path);
      resolve();
    });
    readStream.pipe(writeStream);
  });
};

const mergeFileChunk = async (filePath, fileHash, size) => {
  const chunksDir = path.resolve(UPLOAD_FILES_DIR, fileHash);
  const chunkPaths = await fse.readdir(chunksDir);
  chunkPaths.sort((a, b) => a.split('-')[1] - b.split('')[1]);
  await Promise.all(
    chunkPaths.map((chunkPath, index) =>
      pipeStream(
        path.resolve(chunksDir, chunkPath),
        fse.createWriteStream(filePath, {
          start: index * size,
          end: (index + 1) * size
        })
      )
    )
  );
  fse.rmdirSync(chunksDir);
};

router.post('/merge', async (req, res) => {
  const { fileHash, suffix, size } = req.body;
  const filePath = path.resolve(UPLOAD_FILES_DIR, fileHash + "." + suffix);
  await mergeFileChunk(filePath, fileHash, size);
  res.send({
    code: 200,
    message: 'success'
  });
});

router.post('/verifyFile', async (req, res) => {
  const { fileHash, fileSuffix } = req.body;
  const filePath = path.resolve(UPLOAD_FILES_DIR, fileHash + '.' + fileSuffix);

  if(fse.existsSync(filePath)) {
    res.send({
      code: 200,
      data: {
        isUpload: true,
        uploadedChunkList: [],
      }
    });

    return;
  }

  // 获取已上传的文件列表
  const uploadedList = await getUploadedChunkList(fileHash);
  res.send({
    code: 200,
    data: {
      isUpload: false,
      uploadedChunkList: uploadedList.length > 0 ? uploadedList : [],
    }
  })
});

router.post('/uploadFile', async (req, res) => {
  const multipart = new multiparty.Form();
  multipart.parse(req, async (err, fields, files) => {
    if (err) return;
    const [chunk] = files.chunk;
    const [hash] = fields.hash;
    const [suffix] = fields.suffix;
    // 注意这里的hash包含文件的hash和块的索引，所以需要使用split切分
    const chunksDir = path.resolve(UPLOAD_FILES_DIR, hash.split('-')[0]);
    if (!fse.existsSync(chunksDir)) {
      await fse.mkdirs(chunksDir);
    }
    await fse.move(chunk.path, chunksDir + '/' + hash);
  })
  
  res.send({
    code: 200,
    message: 'received file chunk'
  })
});

module.exports = router;