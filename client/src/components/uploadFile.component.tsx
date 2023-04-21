import { useState } from "react";
import hashWorker from "../utils/hashWorker";

interface IChunkList {
  chunk: Blob
}

const UploadFile = () => {

  const [filename, setFilename] = useState<string>('');
  const [chunkList, setChunkList] = useState<IChunkList[]>([]);
  const [percentage, setPercentage] = useState<number>(0);
  const [fileHash, setFileHash] = useState<string>('');

  const CHUNK_SIZE = 1 * 1024 * 1024;

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

  const verifyFile = () => {

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

    const hash = await calculateHash(chunkList);
    setFileHash(String(hash));
  }


  return (
    <>
      <input type="file" onChange={handleFileChange} /><br />
      <button onClick={handleFileUpload}>上传</button>
    </>
  );
};


export default UploadFile;

