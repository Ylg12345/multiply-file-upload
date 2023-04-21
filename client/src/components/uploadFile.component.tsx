import { useState } from "react";
import { merge, verifyFile, uploadFile } from "../api";
interface IChunkList {
  chunk: Blob
}

const UploadFile = () => {
  const [filename, setFilename] = useState<string>('');
  const [chunkList, setChunkList] = useState<IChunkList[]>([]);
  const [percentage, setPercentage] = useState<number>(0);

  const CHUNK_SIZE = 1 * 1024 * 1024;

  const getFileSuffix = (fileName) => {
    let arr = fileName.split(".");
    if (arr.length > 0) {
      return arr[arr.length - 1]
    }
    return "";
  }


  const splitFile = (file: File, size = CHUNK_SIZE) => {
    const fileChunkList = [];
    let curChunkIndex = 0;

    while(curChunkIndex <= file.size) {
      const chunk = file.slice(curChunkIndex, curChunkIndex + size);
      fileChunkList.push({ chunk });
      curChunkIndex += size;
    }

    return fileChunkList;
  }
 
  const handleFileChange = (e) => {
    const { files } = e.target;
    if(files.length === 0) {
      return;
    }

    setFilename(files[0].name);
    const chunkList = splitFile(files[0])
    setChunkList(chunkList);
  }

  const calculateHash = (list: IChunkList[]) => {
    return new Promise((resolve) => {
      const worker = new Worker('../src/utils/hashWorker.js');
      worker.postMessage({ chunkList: list });
      worker.onmessage = (e) => {
        const { percentage, hash } = e.data;
        setPercentage(percentage);
        if(hash) {
          resolve(hash);
        }
      };
    });
  }

  // 上传分片
  const uploadChunks = async (chunksData, fileHash: string) => {
    const formDataList = chunksData.map(({ chunk, hash }) => {
      const formData = new FormData()
      formData.append('chunk', chunk);
      formData.append('hash', hash);
      formData.append('suffix', getFileSuffix(filename));
      return { formData };
    });

    const requestList = formDataList.map(({ formData }, index) => {
      return uploadFile(formData, (e) => {
        let list = [...chunksData];
        list[index].progress = parseInt(String((e.loaded / e.total) * 100));
        setChunkList(list)
      })
    });

    // Promise.all(requestList).then(() => {
    //   merge({
    //     fileHash,
    //     suffix: getFileSuffix(filename),
    //     size: CHUNK_SIZE
    //   })
    // });
  }

  const handleFileUpload = async () => {
    if(!filename) {
      alert('请先选择文件');
      return;
    }

    if(chunkList.length === 0) {
      alert('文件拆分中，请稍后');
      return;
    }

    const fileHash = await calculateHash(chunkList);

    const fileSuffix = getFileSuffix(filename);
    const result = await verifyFile({
      fileHash,
      fileSuffix,
    });
    const { isUpload, uploadedChunkList } = result.data;

    if(isUpload) {
      alert('文件已存在，无需重复上传');
      return;
    }

    let uploadedChunkIndexList = [];
    if (uploadedChunkList && uploadedChunkList.length > 0) {
      uploadedChunkIndexList = uploadedChunkList.map(item => {
        const arr = item.split('-');
        return parseInt(arr[arr.length - 1])
      })
      alert("已上传的区块号：" + uploadedChunkIndexList.toString())
    }

    const chunksData = chunkList.map(({ chunk }, index) => ({
      chunk: chunk,
      hash: fileHash + "-" + index,
      progress: 0
    })).filter(item => {
      // 过滤掉已上传的块
      const arr = item.hash.split('-')
      return uploadedChunkIndexList.indexOf(parseInt(arr[arr.length - 1])) === -1;
    });

    setChunkList(chunksData);
    uploadChunks(chunksData, String(fileHash))
  }


  return (
    <>
      <input type="file" onChange={handleFileChange} /><br />
      <button onClick={handleFileUpload}>上传</button>
    </>
  );
};


export default UploadFile;

