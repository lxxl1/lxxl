/**
 * 音频播放器功能
 * 提供音乐播放、暂停、上一首、下一首、音量控制等功能
 */

// 当DOM内容加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('初始化音频播放器...');
    initAudioPlayer();
});

// 全局播放器变量
let currentSongIndex = -1;
let playlist = [];
let isPlaying = false;
let audioVolume = 1.0;

// 初始化播放器
function initAudioPlayer() {
    try {
        // 获取DOM元素
        const audioPlayer = document.getElementById('audioPlayer');
        const playPauseButton = document.getElementById('playPauseButton');
        const prevButton = document.getElementById('prevButton');
        const nextButton = document.getElementById('nextButton');
        const volumeSlider = document.getElementById('volumeSlider');
        const muteButton = document.getElementById('muteButton');
        const progressBar = document.querySelector('.progress-bar');
        const currentTimeDisplay = document.getElementById('currentTime');
        const durationDisplay = document.getElementById('duration');
        
        // 检查必要元素
        if (!audioPlayer || !playPauseButton) {
            console.error('找不到必要的音频播放器元素');
            return;
        }
        
        // 播放/暂停按钮事件
        if (playPauseButton) {
            playPauseButton.addEventListener('click', togglePlayPause);
        }
        
        // 上一首按钮事件
        if (prevButton) {
            prevButton.addEventListener('click', playPrevious);
        }
        
        // 下一首按钮事件
        if (nextButton) {
            nextButton.addEventListener('click', playNext);
        }
        
        // 音量控制事件
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                setVolume(e.target.value / 100);
            });
        }
        
        // 静音按钮事件
        if (muteButton) {
            muteButton.addEventListener('click', toggleMute);
        }
        
        // 音频事件
        if (audioPlayer) {
            // 时间更新事件
            audioPlayer.addEventListener('timeupdate', updateProgress);
            
            // 播放结束事件
            audioPlayer.addEventListener('ended', () => {
                playNext();
            });
            
            // 加载元数据事件
            audioPlayer.addEventListener('loadedmetadata', () => {
                if (durationDisplay) {
                    durationDisplay.textContent = formatTime(audioPlayer.duration);
                }
            });
            
            // 错误处理
            audioPlayer.addEventListener('error', (e) => {
                console.error('音频播放错误:', e);
                showMessage('播放出错，请尝试其他歌曲', 'error');
            });
        }
        
        // 收集当前页面上的所有歌曲
        collectSongs();
        
        console.log('音频播放器初始化完成');
    } catch (error) {
        console.error('初始化音频播放器出错:', error);
    }
}

// 收集页面上的所有歌曲
function collectSongs() {
    try {
        playlist = [];
        const songButtons = document.querySelectorAll('.play-song');
        
        songButtons.forEach(button => {
            const songUrl = button.getAttribute('data-song-url');
            const songName = button.getAttribute('data-song-name');
            const songArtist = button.getAttribute('data-song-artist');
            const songCover = button.getAttribute('data-song-cover');
            
            if (songUrl && songUrl !== '#') {
                playlist.push({
                    url: songUrl,
                    name: songName || 'Unknown Song',
                    artist: songArtist || 'Unknown Artist',
                    cover: songCover || 'assets/media/image/default-cover.jpg'
                });
            }
        });
        
        console.log(`收集了 ${playlist.length} 首歌曲`);
    } catch (error) {
        console.error('收集歌曲列表出错:', error);
    }
}

// 播放/暂停切换
function togglePlayPause() {
    try {
        const audioPlayer = document.getElementById('audioPlayer');
        const playPauseButton = document.getElementById('playPauseButton');
        
        if (!audioPlayer) return;
        
        if (audioPlayer.paused) {
            // 开始播放
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isPlaying = true;
                    if (playPauseButton) {
                        playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
                    }
                }).catch(error => {
                    console.error('播放失败:', error);
                });
            }
        } else {
            // 暂停播放
            audioPlayer.pause();
            isPlaying = false;
            if (playPauseButton) {
                playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
    } catch (error) {
        console.error('播放/暂停切换出错:', error);
    }
}

// 播放上一首
function playPrevious() {
    try {
        if (playlist.length === 0) return;
        
        if (currentSongIndex > 0) {
            currentSongIndex--;
        } else {
            currentSongIndex = playlist.length - 1;
        }
        
        playSongAtIndex(currentSongIndex);
    } catch (error) {
        console.error('播放上一首出错:', error);
    }
}

// 播放下一首
function playNext() {
    try {
        if (playlist.length === 0) return;
        
        if (currentSongIndex < playlist.length - 1) {
            currentSongIndex++;
        } else {
            currentSongIndex = 0;
        }
        
        playSongAtIndex(currentSongIndex);
    } catch (error) {
        console.error('播放下一首出错:', error);
    }
}

// 播放指定索引的歌曲
function playSongAtIndex(index) {
    try {
        if (index < 0 || index >= playlist.length) return;
        
        const song = playlist[index];
        const audioPlayer = document.getElementById('audioPlayer');
        
        if (!audioPlayer || !song) return;
        
        // 设置音频源
        audioPlayer.src = song.url;
        
        // 更新播放器UI
        document.getElementById('currentSongTitle').textContent = song.name;
        document.getElementById('currentSongArtist').textContent = song.artist;
        document.getElementById('currentSongCover').src = song.cover;
        
        // 播放
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                const playPauseButton = document.getElementById('playPauseButton');
                if (playPauseButton) {
                    playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
                }
            }).catch(error => {
                console.error('播放失败:', error);
            });
        }
        
        currentSongIndex = index;
    } catch (error) {
        console.error('播放歌曲出错:', error);
    }
}

// 设置音量
function setVolume(value) {
    try {
        const audioPlayer = document.getElementById('audioPlayer');
        const muteButton = document.getElementById('muteButton');
        
        if (!audioPlayer) return;
        
        audioVolume = value;
        audioPlayer.volume = value;
        
        // 更新静音按钮图标
        if (muteButton) {
            if (value === 0) {
                muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
            } else if (value < 0.5) {
                muteButton.innerHTML = '<i class="fas fa-volume-down"></i>';
            } else {
                muteButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        }
    } catch (error) {
        console.error('设置音量出错:', error);
    }
}

// 切换静音
function toggleMute() {
    try {
        const audioPlayer = document.getElementById('audioPlayer');
        const volumeSlider = document.getElementById('volumeSlider');
        
        if (!audioPlayer) return;
        
        if (audioPlayer.volume > 0) {
            // 当前有声音，设为静音
            audioPlayer.volume = 0;
            if (volumeSlider) volumeSlider.value = 0;
            document.getElementById('muteButton').innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else {
            // 当前静音，恢复音量
            audioPlayer.volume = audioVolume || 1;
            if (volumeSlider) volumeSlider.value = (audioVolume || 1) * 100;
            
            if (audioVolume < 0.5) {
                document.getElementById('muteButton').innerHTML = '<i class="fas fa-volume-down"></i>';
            } else {
                document.getElementById('muteButton').innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        }
    } catch (error) {
        console.error('切换静音出错:', error);
    }
}

// 更新进度条
function updateProgress() {
    try {
        const audioPlayer = document.getElementById('audioPlayer');
        const progressBar = document.querySelector('.progress-bar');
        const currentTimeDisplay = document.getElementById('currentTime');
        
        if (!audioPlayer || !progressBar || !currentTimeDisplay) return;
        
        const currentTime = audioPlayer.currentTime;
        const duration = audioPlayer.duration || 0;
        
        // 更新进度条
        if (duration > 0) {
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
        }
        
        // 更新时间显示
        currentTimeDisplay.textContent = formatTime(currentTime);
    } catch (error) {
        console.error('更新进度条出错:', error);
    }
}

// 格式化时间为 mm:ss
function formatTime(seconds) {
    try {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    } catch (error) {
        console.error('格式化时间出错:', error);
        return '0:00';
    }
}

// 显示消息
function showMessage(message, type = 'info') {
    try {
        const alertsContainer = document.getElementById('alerts');
        if (!alertsContainer) {
            console.error('找不到提示容器元素');
            return;
        }
        
        const alertId = 'alert-' + Date.now();
        
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        
        alertsContainer.innerHTML += alertHTML;
        
        // 自动关闭
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                if (typeof $ !== 'undefined') {
                    $(alertElement).alert('close');
                } else {
                    alertElement.style.display = 'none';
                    alertElement.remove();
                }
            }
        }, 5000);
    } catch (error) {
        console.error('显示消息出错:', error);
    }
}

// 暴露公共方法供外部使用
window.audioPlayerControls = {
    play: togglePlayPause,
    previous: playPrevious,
    next: playNext,
    setVolume: setVolume,
    toggleMute: toggleMute,
    refreshPlaylist: collectSongs
};

// 添加playSongAudioPlayer函数用于ES模块导出
export function playSongAudioPlayer(url, name, artist, cover) {
    try {
        const audioPlayer = document.getElementById('audioPlayer');
        if (!audioPlayer) {
            console.error('Audio player element not found');
            return;
        }

        console.log(`Attempting to play: ${name} from ${url}`); // Debug log

        // Update UI first
        document.getElementById('currentSongTitle').textContent = name;
        document.getElementById('currentSongArtist').textContent = artist;
        document.getElementById('currentSongCover').src = cover;

        // Stop current playback before loading new source
        if (!audioPlayer.paused) {
            console.log('Pausing current playback before loading new song.'); // Debug log
            audioPlayer.pause();
        }

        // Reset progress bar and time display
        const progressBar = document.querySelector('.progress-bar');
        const currentTimeDisplay = document.getElementById('currentTime');
        if (progressBar) progressBar.style.width = '0%';
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';

        // Set the new source
        console.log('Setting new audio source.'); // Debug log
        audioPlayer.src = url;

        // Explicitly load the new source
        console.log('Explicitly loading new source.'); // Debug log
        audioPlayer.load();

        // Play the audio
        console.log('Calling play().'); // Debug log
        const playPromise = audioPlayer.play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Playback started successfully
                isPlaying = true;
                const playPauseButton = document.getElementById('playPauseButton');
                if (playPauseButton) {
                    playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
                }
                console.log(`Playback started successfully for: ${name}`); // Debug log
            })
            .catch(error => {
                // Playback failed or was interrupted.
                console.error(`Playback error for ${name}:`, error);
                // Avoid setting isPlaying to false here, as the state might be indeterminate
                showMessage(`无法播放歌曲: ${name}. ${error.message}`, 'error');
            });
        }

        // Update playlist logic if needed
        const existingIndex = playlist.findIndex(item => item.url === url);
        if (existingIndex !== -1) {
            currentSongIndex = existingIndex;
        } else {
            // Optionally add the newly played song to the playlist
             const newSong = { url, name, artist, cover };
             playlist.push(newSong);
             currentSongIndex = playlist.length - 1;
             console.log("Added new song to playlist and set as current.");
        }

    } catch (error) {
        console.error('Error in playSongAudioPlayer:', error);
        showMessage('播放器发生内部错误', 'error');
    }
} 