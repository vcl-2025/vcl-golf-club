import { useEffect, useRef, useState } from "react";
import { uploadImageToSupabase, validateImageFile } from "../utils/imageUpload";

interface TinyMCEEditorProps {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  /** 填满父容器高度（父级需 flex-1 + min-h-0） */
  fillHeight?: boolean;
  editorId?: string;
}

const EDITOR_CONTENT_STYLE =
  'body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size: 14px; } img { max-width: 100%; height: auto; }';

export default function TinyMCEEditor({
  content,
  onChange,
  placeholder = "请输入内容...",
  height = 300,
  fillHeight = false,
  editorId: propEditorId,
}: TinyMCEEditorProps) {
  const editorId = useRef(propEditorId || `editor-${Math.random().toString(36).substr(2, 9)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tinymceLoaded, setTinymceLoaded] = useState(false);
  const [tinymceError, setTinymceError] = useState(false);

  const resizeEditorToContainer = () => {
    if (!fillHeight || !containerRef.current || !window.tinymce) return;
    const editor = window.tinymce.get(editorId.current);
    if (!editor) return;

    const nextHeight = Math.max(Math.floor(containerRef.current.clientHeight), 240);
    const container = editor.getContainer?.();
    if (container) {
      container.style.height = `${nextHeight}px`;
    }
    if (typeof editor.theme?.resizeTo === 'function') {
      editor.theme.resizeTo(container?.clientWidth || null, nextHeight);
    }
  };

  useEffect(() => {
    if (!fillHeight || !containerRef.current) return;

    const observer = new ResizeObserver(() => {
      resizeEditorToContainer();
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [fillHeight, tinymceLoaded]);

  // 检测是否为移动设备和微信浏览器
  useEffect(() => {
    const checkMobile = () => {
        const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
        setIsMobile(isMobileDevice);
      
      // 如果是微信浏览器，直接使用降级方案
      if (isWeChat) {
        setTinymceError(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (initialized.current) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tinymce@6.8.3/tinymce.min.js';
    script.onload = () => {
      console.log('TinyMCE脚本加载成功');
      if (window.tinymce) {
        console.log('TinyMCE对象可用');
        // 检测是否为移动设备，使用不同的配置
        const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('设备检测:', { isMobileDevice, userAgent: navigator.userAgent, screenWidth: window.innerWidth });
        
        const mobileConfig = getMobileConfig();
        console.log('移动端配置:', mobileConfig);
        
        const initialHeight = fillHeight
          ? Math.max(containerRef.current?.clientHeight || height, 240)
          : height;

        window.tinymce.init({
          selector: `#${editorId.current}`,
          height: initialHeight,
          theme: 'silver',
          skin: 'oxide',
          plugins: isMobileDevice ? [
            'lists', 'link', 'image', 'emoticons', 'wordcount'
          ] : [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons',
            'template', 'codesample', 'hr', 'pagebreak', 'nonbreaking', 'toc',
            'imagetools', 'textpattern', 'noneditable', 'quickbars', 'accordion'
          ],
          toolbar: isMobileDevice ? [
                'undo redo | bold italic underline | bullist numlist | link image | emoticons | template'
          ] : [
            'undo redo | blocks fontfamily fontsizeinput | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify',
                'bullist numlist outdent indent | removeformat | help | link image media table | emoticons charmap | code fullscreen preview | searchreplace | wordcount | template'
          ],
          toolbar_mode: isMobileDevice ? 'scrolling' : 'sliding',
          ...mobileConfig,
          contextmenu: 'link image imagetools table spellchecker configurepermanentpen',
          menubar: 'file edit view insert format tools table help',
          menu: {
            file: { title: '文件', items: 'newdocument restoredraft | preview | export print | deleteallconversations' },
            edit: { title: '编辑', items: 'undo redo | cut copy paste pastetext | selectall | searchreplace' },
            view: { title: '视图', items: 'code | visualaid visualchars visualblocks | spellchecker | preview fullscreen | showcomments' },
            insert: { title: '插入', items: 'image link media template codesample inserttable | charmap emoticons hr | pagebreak nonbreaking anchor toc | insertdatetime' },
            format: { title: '格式', items: 'bold italic underline strikethrough superscript subscript codeformat | blocks fontfamily fontsize align lineheight | forecolor backcolor removeformat' },
            tools: { title: '工具', items: 'spellchecker spellcheckerlanguage | a11ycheck code wordcount' },
            table: { title: '表格', items: 'inserttable | cell row column | tableprops deletetable' },
            help: { title: '帮助', items: 'help' }
          },
          placeholder: placeholder,
          branding: false,
          statusbar: true,
          promotion: false,
          content_style: EDITOR_CONTENT_STYLE,
          font_family_formats: '微软雅黑=Microsoft YaHei,Helvetica Neue,PingFang SC,sans-serif;苹果苹方=PingFang SC,Microsoft YaHei,sans-serif;宋体=simsun,serif;仿宋体=FangSong,serif;黑体=SimHei,sans-serif;Arial=arial,helvetica,sans-serif;Arial Black=arial black,avant garde;Times New Roman=times new roman,times;Courier New=courier new,courier;',
          font_size_formats: '8pt 9pt 10pt 11pt 12pt 13pt 14pt 15pt 16pt 17pt 18pt 19pt 20pt 21pt 22pt 23pt 24pt 25pt 26pt 27pt 28pt 29pt 30pt 32pt 34pt 36pt 38pt 40pt 42pt 44pt 46pt 48pt 50pt 52pt 54pt 56pt 58pt 60pt 62pt 64pt 66pt 68pt 70pt 72pt 74pt 76pt 78pt 80pt 82pt 84pt 86pt 88pt 90pt 92pt 94pt 96pt 98pt 100pt',
          image_advtab: true,
          image_caption: true,
          image_title: true,
          image_description: true,
          image_dimensions: true,
          image_class_list: [
            {title: 'Responsive', value: 'img-responsive'},
            {title: 'Rounded', value: 'img-rounded'},
            {title: 'Circle', value: 'img-circle'},
            {title: 'Thumbnail', value: 'img-thumbnail'}
          ],
          table_default_attributes: {
            border: '1'
          },
          table_default_styles: {
            'border-collapse': 'collapse',
            'width': '100%'
          },
          table_class_list: [
            {title: 'None', value: ''},
            {title: 'Table', value: 'table'},
            {title: 'Striped', value: 'table table-striped'},
            {title: 'Bordered', value: 'table table-bordered'},
            {title: 'Hover', value: 'table table-hover'}
          ],
          templates: [
            {
              title: '豪华活动回顾模板',
              description: '带样式的精美活动回顾模板',
              url: '/templates/activity-review.html'
            },
            {
              title: '专业比赛通知模板',
              description: '带表格和样式的比赛通知模板',
              url: '/templates/competition-notice.html'
            },
            {
              title: '精美会员活动邀请模板',
              description: '带卡片样式的活动邀请模板',
              url: '/templates/member-activity.html'
            },
            {
              title: '正式新闻公告模板',
              description: '带官方样式的新闻公告模板',
              url: '/templates/official-announcement.html'
            }
          ],
          images_upload_handler: async (blobInfo: any, progress: any) => {
            try {
              // 验证文件
              const file = blobInfo.blob() as File
              console.log('上传文件信息:', {
                name: file.name,
                type: file.type,
                size: file.size
              })
              
              validateImageFile(file)
              
              // 显示上传进度
              progress(0)
              
              // 上传到 Supabase
              const result = await uploadImageToSupabase(file, 'golf-club-images', 'articles')
              
              console.log('上传结果:', result)
              
              if (result.success && result.url) {
                progress(100)
                return result.url
              } else {
                throw new Error(result.error || '上传失败')
              }
            } catch (error) {
              console.error('图片上传失败:', error)
              // 返回错误信息而不是抛出异常
              return Promise.reject(error)
            }
          },
          setup: (editor: any) => {
            editor.on('init', () => {
              // 强制设置 LTR 方向
              editor.getBody().style.direction = 'ltr';
              editor.getBody().style.textAlign = 'left';
              
              // 初始化时立即设置内容（使用当前content值）
              // 使用setTimeout确保编辑器完全初始化后再设置内容
              setTimeout(() => {
                if (content) {
                  editor.setContent(content);
                }
                resizeEditorToContainer();
              }, 0);
            });
            editor.on('change keyup', () => {
              onChange(editor.getContent());
            });
            
            // 监听全屏状态变化，动态添加/移除 body 类以隐藏 header
            editor.on('FullscreenStateChanged', (e: any) => {
              if (e.state) {
                // 进入全屏时，添加类到 body
                document.body.classList.add('tox-fullscreen-active');
              } else {
                // 退出全屏时，移除类
                document.body.classList.remove('tox-fullscreen-active');
              }
            });
            
            editor.on('error', (e: any) => {
              console.error('TinyMCE 错误:', e);
            });
          },
          init_instance_callback: (editor: any) => {
            console.log('TinyMCE 实例初始化完成:', editor.id);
            // 在实例完全初始化后，再次尝试设置内容
            setTimeout(() => {
              if (content && editor.getContent() !== content) {
                editor.setContent(content);
              }
            }, 100);
          }
        });
        initialized.current = true;
        setTinymceLoaded(true);
      }
    };
    script.onerror = (error) => {
      console.error('TinyMCE脚本加载失败:', error);
      setTinymceError(true);
      console.log('尝试使用CDN加载TinyMCE...');
      
      // 如果本地脚本失败，尝试使用CDN
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js';
      cdnScript.onload = () => {
        console.log('TinyMCE CDN脚本加载成功');
        if (window.tinymce) {
          console.log('TinyMCE CDN对象可用');
          // 重新初始化TinyMCE（复制初始化逻辑）
          const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const mobileConfig = getMobileConfig();
          
          const initialHeight = fillHeight
            ? Math.max(containerRef.current?.clientHeight || height, 240)
            : height;

          window.tinymce.init({
            selector: `#${editorId.current}`,
            height: initialHeight,
            plugins: isMobileDevice ? [
              'lists', 'link', 'image', 'emoticons', 'wordcount'
            ] : [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'wordcount', 'emoticons',
              'template', 'codesample', 'hr', 'pagebreak', 'nonbreaking', 'toc',
              'imagetools', 'textpattern', 'noneditable', 'quickbars', 'accordion'
            ],
            toolbar: isMobileDevice ? [
                'undo redo | bold italic underline | bullist numlist | link image | emoticons | template'
            ] : [
              'undo redo | blocks fontfamily fontsizeinput | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify',
                'bullist numlist outdent indent | removeformat | help | link image media table | emoticons charmap | code fullscreen preview | searchreplace | wordcount | template'
            ],
            toolbar_mode: isMobileDevice ? 'scrolling' : 'sliding',
            ...mobileConfig,
            contextmenu: 'link image imagetools table spellchecker configurepermanentpen',
            menubar: 'file edit view insert format tools table help',
            menu: {
              file: { title: '文件', items: 'newdocument restoredraft | preview | export print | deleteallconversations' },
              edit: { title: '编辑', items: 'undo redo | cut copy paste pastetext | selectall | searchreplace' },
              view: { title: '视图', items: 'code | visualaid visualchars visualblocks | spellchecker | preview fullscreen | showcomments' },
              insert: { title: '插入', items: 'image link media template codesample inserttable | charmap emoticons hr | pagebreak nonbreaking anchor toc | insertdatetime' },
              format: { title: '格式', items: 'bold italic underline strikethrough superscript subscript codeformat | blocks fontfamily fontsize align lineheight | forecolor backcolor removeformat' },
              tools: { title: '工具', items: 'spellchecker spellcheckerlanguage | a11ycheck code wordcount' },
              table: { title: '表格', items: 'inserttable | cell row column | tableprops deletetable' },
              help: { title: '帮助', items: 'help' }
            },
            placeholder: placeholder,
            branding: false,
            statusbar: true,
            promotion: false,
            license_key: 'gpl',
            language: 'zh_CN',
            content_style: EDITOR_CONTENT_STYLE,
            font_family_formats: '微软雅黑=Microsoft YaHei,Helvetica Neue,PingFang SC,sans-serif;苹果苹方=PingFang SC,Microsoft YaHei,sans-serif;宋体=simsun,serif;仿宋体=FangSong,serif;黑体=SimHei,sans-serif;Arial=arial,helvetica,sans-serif;Arial Black=arial black,avant garde;Times New Roman=times new roman,times;Courier New=courier new,courier;',
            font_size_formats: '8pt 9pt 10pt 11pt 12pt 13pt 14pt 15pt 16pt 17pt 18pt 19pt 20pt 21pt 22pt 23pt 24pt 25pt 26pt 27pt 28pt 29pt 30pt 32pt 34pt 36pt 38pt 40pt 42pt 44pt 46pt 48pt 50pt 52pt 54pt 56pt 58pt 60pt 62pt 64pt 66pt 68pt 70pt 72pt 74pt 76pt 78pt 80pt 82pt 84pt 86pt 88pt 90pt 92pt 94pt 96pt 98pt 100pt',
            setup: (editor: any) => {
              editor.on('init', () => {
                console.log('TinyMCE CDN 初始化成功');
                // 使用setTimeout确保编辑器完全初始化后再设置内容
                setTimeout(() => {
                  if (content) {
                    editor.setContent(content);
                  }
                  resizeEditorToContainer();
                }, 0);
              });
              
              // 监听全屏状态变化，动态添加/移除 body 类以隐藏 header
              editor.on('FullscreenStateChanged', (e: any) => {
                if (e.state) {
                  // 进入全屏时，添加类到 body
                  document.body.classList.add('tox-fullscreen-active');
                } else {
                  // 退出全屏时，移除类
                  document.body.classList.remove('tox-fullscreen-active');
                }
              });
              editor.on('change keyup', () => {
                onChange(editor.getContent());
              });
            }
          });
          initialized.current = true;
          setTinymceLoaded(true);
        }
      };
      cdnScript.onerror = (cdnError) => {
        console.error('TinyMCE CDN脚本也加载失败:', cdnError);
        setTinymceError(true);
      };
      document.head.appendChild(cdnScript);
    };
    document.head.appendChild(script);

    return () => {
      if (window.tinymce) {
        window.tinymce.remove(`#${editorId.current}`);
      }
    };
  }, []);

  // 监听 content 变化，更新编辑器内容
  useEffect(() => {
    if (!window.tinymce) return;
    
    const updateEditorContent = () => {
      const editor = window.tinymce.get(editorId.current);
      if (editor && editor.getContent) {
        const currentContent = editor.getContent();
        // 只有当内容真正不同时才更新，避免无限循环
        if (currentContent !== content) {
          editor.setContent(content || '');
          return true; // 成功设置
        }
        return true; // 内容相同，也算成功
      }
      return false; // 编辑器未准备好
    };

    // 立即尝试设置内容
    if (updateEditorContent()) {
      return; // 成功，无需重试
    }

    // 如果编辑器还没初始化，使用重试机制
    let retryCount = 0;
    const maxRetries = 10; // 最多重试10次
    const retryInterval = 200; // 每次间隔200ms，总共最多2秒

    const retryTimer = setInterval(() => {
      retryCount++;
      if (updateEditorContent() || retryCount >= maxRetries) {
        clearInterval(retryTimer);
      }
    }, retryInterval);

    return () => {
      clearInterval(retryTimer);
    };
  }, [content, editorId]);

  // 移动设备使用TinyMCE的移动端配置
  const getMobileConfig = () => {
    if (!isMobile) return {};
    
    return {
      mobile: {
        menubar: false,
        toolbar_mode: 'scrolling',
        toolbar_sticky: false,
        table_grid: false,
        resize: false,
        object_resizing: false,
        plugins: [
          'lists', 'link', 'image', 'emoticons', 'wordcount'
        ],
        toolbar: [
                'undo redo | bold italic underline | bullist numlist | link image | emoticons | template'
        ]
      }
    };
  };

  // 移动端降级方案：增强的textarea
  const renderMobileFallback = () => {
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    
    return (
      <div className="w-full">
        <div className="mb-2 text-sm text-gray-600">
          {isWeChat ? '💬 微信编辑器（简化版）' : '📱 移动端编辑器（简化版）'}
        </div>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 border border-gray-300 rounded-lg resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          style={{ height: `${height}px`, fontSize: '16px' }}
        />
        <div className="mt-2 text-xs text-gray-500">
          {isWeChat 
            ? '💡 微信浏览器使用简化编辑器，支持基本文本输入。如需富文本编辑，请在Safari浏览器中打开。'
            : '💡 移动端使用简化编辑器，支持基本文本输入。如需富文本编辑，请在电脑上操作。'
          }
        </div>
        <div className="mt-2 text-xs text-blue-600">
          💡 提示：可以使用HTML标签，如 &lt;b&gt;粗体&lt;/b&gt;、&lt;i&gt;斜体&lt;/i&gt;、&lt;br&gt;换行
        </div>
        {isWeChat && (
          <div className="mt-2 text-xs text-green-600">
            💡 建议：复制链接到Safari浏览器打开，获得更好的编辑体验
          </div>
        )}
      </div>
    );
  };

  // 如果TinyMCE加载失败且是移动设备，使用降级方案
  if (tinymceError && isMobile) {
    return renderMobileFallback();
  }

  const textarea = <textarea id={editorId.current} />;

  if (fillHeight) {
    return (
      <div ref={containerRef} className="tinymce-container h-full min-h-[240px] w-full">
        {textarea}
      </div>
    );
  }

  return textarea;
}

declare global {
  interface Window {
    tinymce: any;
  }
}