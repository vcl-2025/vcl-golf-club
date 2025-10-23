import { useEffect, useRef, useState } from "react";
import { uploadImageToSupabase, validateImageFile } from "../utils/imageUpload";

interface TinyMCEEditorProps {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  editorId?: string;
}

export default function TinyMCEEditor({
  content,
  onChange,
  placeholder = "请输入内容...",
  height = 300,
  editorId: propEditorId,
}: TinyMCEEditorProps) {
  const editorId = useRef(propEditorId || `editor-${Math.random().toString(36).substr(2, 9)}`);
  const initialized = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tinymceLoaded, setTinymceLoaded] = useState(false);
  const [tinymceError, setTinymceError] = useState(false);

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
        
        window.tinymce.init({
          selector: `#${editorId.current}`,
          height: height,
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
            'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify',
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
          content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size: 14px; }',
          font_family_formats: '微软雅黑=Microsoft YaHei,Helvetica Neue,PingFang SC,sans-serif;苹果苹方=PingFang SC,Microsoft YaHei,sans-serif;宋体=simsun,serif;仿宋体=FangSong,serif;黑体=SimHei,sans-serif;Arial=arial,helvetica,sans-serif;Arial Black=arial black,avant garde;Times New Roman=times new roman,times;Courier New=courier new,courier;',
          fontsize_formats: '8px 10px 12px 14px 16px 18px 20px 24px 28px 32px 36px 48px 64px 72px 96px',
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
              // console.log('TinyMCE 初始化成功');
              // console.log('TinyMCE 初始化，设置内容:', content);
              // console.log('TinyMCE 初始化，内容长度:', content?.length);
              
              // 强制设置 LTR 方向
              editor.getBody().style.direction = 'ltr';
              editor.getBody().style.textAlign = 'left';
              
              if (content) {
                editor.setContent(content);
                //console.log('初始化后编辑器内容:', editor.getContent());
              }
            });
            editor.on('change keyup', () => {
              onChange(editor.getContent());
            });
            editor.on('error', (e: any) => {
              console.error('TinyMCE 错误:', e);
            });
          },
              init_instance_callback: (editor: any) => {
                console.log('TinyMCE 实例初始化完成:', editor.id);
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
          
          window.tinymce.init({
            selector: `#${editorId.current}`,
            height: height,
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
              'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify',
                'bullist numlist outdent indent | removeformat | help | link image media table | emoticons charmap | code fullscreen preview | searchreplace | wordcount | template'
            ],
            toolbar_mode: isMobileDevice ? 'scrolling' : 'sliding',
            ...mobileConfig,
            placeholder: placeholder,
            branding: false,
            statusbar: true,
            promotion: false,
            license_key: 'gpl',
            language: 'zh_CN',
            setup: (editor: any) => {
              editor.on('init', () => {
                console.log('TinyMCE CDN 初始化成功');
                if (content) {
                  editor.setContent(content);
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
    if (window.tinymce) {
      const editor = window.tinymce.get(editorId.current);
      if (editor && editor.getContent) {
        const currentContent = editor.getContent();
        // 只有当内容真正不同时才更新，避免无限循环
        if (currentContent !== content) {
          // console.log('TinyMCE 更新内容:', content);
          // console.log('TinyMCE 当前编辑器内容:', currentContent);
          editor.setContent(content);
          // console.log('设置后编辑器内容:', editor.getContent());
        }
      } else {
        // console.log('TinyMCE 编辑器未找到或未初始化');
        // 如果编辑器还没初始化，延迟重试
        if (content) {
          setTimeout(() => {
            const retryEditor = window.tinymce.get(editorId.current);
            if (retryEditor && retryEditor.getContent) {
              // console.log('TinyMCE 延迟设置内容:', content);
              retryEditor.setContent(content);
            }
          }, 1000);
        }
      }
    }
  }, [content]);

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

  return <textarea id={editorId.current} />;
}

declare global {
  interface Window {
    tinymce: any;
  }
}