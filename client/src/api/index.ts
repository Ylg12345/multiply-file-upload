import axios from 'axios';

const request = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
})

export const merge = (params) => {
  return request({
    url: '/merge',
    method: 'post',
    data: params
  })
}

export const verifyFile = (params) => {
  return request({
    url: '/verifyFile',
    method: 'post',
    data: params
  })
}

export const uploadFile = (params, progressCallback) => {
  return request({
    url: '/uploadFile',
    method: 'post',
    data: params,
    onUploadProgress: (e) => {
      progressCallback(e);
    },
  })
}