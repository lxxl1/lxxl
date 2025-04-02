import { API_URL } from '../../../Common/js/config.js';

document.addEventListener('DOMContentLoaded', function() {
    // 初始化上传功能
    initUploadFunctionality();
    
    // 初始化拖拽上传
    initDragAndDrop();
    
    // 初始化表单提交
    initFormSubmit();
});

/**
 * 初始化上传功能
 */
function initUploadFunctionality() {
    // 浏览文件按钮
    const browseButton = document.getElementById('browseFilesBtn');
    const fileInput = document.getElementById('musicFileInput');
    
    browseButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    // 显示选中的文件名
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const fileName = this.files[0].name;
            const fileSize = (this.files[0].size / (1024 * 1024)).toFixed(2); // 转换为MB
            
            browseButton.textContent = `已选择: ${fileName} (${fileSize}MB)`;
            
            // 检查文件大小
            if (this.files[0].size > 50 * 1024 * 1024) { // 50MB限制
                showMessage('文件过大，请选择50MB以下的音乐文件', 'danger');
                this.value = '';
                browseButton.textContent = '浏览文件';
            }
        } else {
            browseButton.textContent = '浏览文件';
        }
    });
    
    // MV文件上传
    const mvFileInput = document.getElementById('mvFileInput');
    
    mvFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const fileSize = (this.files[0].size / (1024 * 1024)).toFixed(2); // 转换为MB
            
            // 检查文件大小
            if (this.files[0].size > 500 * 1024 * 1024) { // 500MB限制
                showMessage('文件过大，请选择500MB以下的视频文件', 'danger');
                this.value = '';
            }
        }
    });
}

/**
 * 初始化拖拽上传
 */
function initDragAndDrop() {
    const dropArea = document.querySelector('.upload-area-inner');
    const fileInput = document.getElementById('musicFileInput');
    
    // 防止默认拖拽行为（防止浏览器默认打开文件）
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 高亮显示拖放区
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('border-primary');
    }
    
    function unhighlight() {
        dropArea.classList.remove('border-primary');
    }
    
    // 处理文件拖放
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0]; // 只取第一个文件
            
            // 检查是否为音频文件
            if (!file.type.match('audio.*')) {
                showMessage('请上传音频文件', 'danger');
                return;
            }
            
            // 检查文件大小
            if (file.size > 50 * 1024 * 1024) { // 50MB限制
                showMessage('文件过大，请选择50MB以下的音乐文件', 'danger');
                return;
            }
            
            // 设置文件输入
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            
            // 更新按钮文本
            const browseButton = document.getElementById('browseFilesBtn');
            const fileName = file.name;
            const fileSize = (file.size / (1024 * 1024)).toFixed(2); // 转换为MB
            browseButton.textContent = `已选择: ${fileName} (${fileSize}MB)`;
            
            showMessage('文件已准备好上传', 'success');
        }
    }
}

/**
 * 初始化表单提交
 */
function initFormSubmit() {
    const form = document.getElementById('uploadMusicForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 检查音乐文件是否已选择
        const musicFile = document.getElementById('musicFileInput').files[0];
        if (!musicFile) {
            showMessage('请选择要上传的音乐文件', 'danger');
            return;
        }
        
        // 检查是否同意条款
        const termsCheck = document.getElementById('termsCheck');
        if (!termsCheck.checked) {
            showMessage('请确认您拥有分享此音乐的权利', 'danger');
            return;
        }
        
        // 获取表单数据
        const formData = new FormData();
        
        // 添加必填字段
        formData.append('singerId', document.getElementById('singerId').value);
        formData.append('name', document.getElementById('songName').value);
        formData.append('introduction', document.getElementById('introduction').value || '');
        formData.append('lyric', document.getElementById('lyric').value || '');
        
        // 添加音乐文件
        formData.append('file', musicFile);
        
        // 添加MV文件（如果有）
        const mvFile = document.getElementById('mvFileInput').files[0];
        if (mvFile) {
            formData.append('files', mvFile);
        } else {
            // 后端需要files参数，如果没有MV，添加一个空文件
            formData.append('files', new File([], 'empty.mp4', { type: 'video/mp4' }));
        }
        
        // 显示上传进度条
        const progressBar = document.querySelector('#uploadProgress .progress-bar');
        const progressContainer = document.getElementById('uploadProgress');
        progressContainer.style.display = 'flex';
        
        // 禁用提交按钮
        const uploadButton = document.getElementById('uploadButton');
        uploadButton.disabled = true;
        uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 上传中...';
        
        try {
            const response = await axios.post(`${API_URL}/song/add`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: function(progressEvent) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    progressBar.style.width = percentCompleted + '%';
                    progressBar.setAttribute('aria-valuenow', percentCompleted);
                }
            });
            
            // 处理响应
            if (response.data.code === 1) {
                showMessage('音乐上传成功！', 'success');
                // 重置表单
                form.reset();
                // 重置文件输入
                document.getElementById('browseFilesBtn').textContent = '浏览文件';
                // 延迟2秒后重定向到音乐列表页
                setTimeout(() => {
                    window.location.href = 'my-music.html';
                }, 2000);
            } else {
                showMessage(`上传失败: ${response.data.msg}`, 'danger');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showMessage('上传过程中发生错误，请稍后重试', 'danger');
        } finally {
            // 重新启用提交按钮
            uploadButton.disabled = false;
            uploadButton.innerHTML = '上传音乐';
            // 隐藏进度条
            progressContainer.style.display = 'none';
        }
    });
}

/**
 * 显示消息提示
 */
function showMessage(message, type) {
    // 检查是否已存在消息容器
    let messageContainer = document.querySelector('.message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = 'message-container position-fixed top-0 end-0 p-3';
        messageContainer.style.zIndex = '9999';
        document.body.appendChild(messageContainer);
    }
    
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show`;
    messageElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-dismiss="alert" aria-label="Close"></button>
    `;
    
    // 添加到容器中
    messageContainer.appendChild(messageElement);
    
    // 自动消失
    setTimeout(() => {
        messageElement.classList.remove('show');
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    }, 5000);
    
    // 关闭按钮功能
    messageElement.querySelector('.btn-close').addEventListener('click', function() {
        messageElement.classList.remove('show');
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    });
} 