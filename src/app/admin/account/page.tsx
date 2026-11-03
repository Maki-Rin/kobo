import { redirect } from 'next/navigation';
import { currentUser, listPasskeys, roleLabels } from '@/lib/editor/auth';
import LinkButton from '../_components/LinkButton';
import PasskeyList from '../_components/PasskeyList';
import { addDeviceInviteAction, logoutAction } from '../actions';
import { badge, button, card, pageTitle } from '../_components/ui';

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect('/admin');
  const passkeys = await listPasskeys(user.id);
  const addDevice = addDeviceInviteAction.bind(null, user.id);

  return (
    <div className='space-y-8'>
      <h1 className={pageTitle}>アカウント</h1>

      <section className={`${card} flex flex-wrap items-center gap-4 p-5`}>
        <div className='flex size-11 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600'>
          {user.displayName.slice(0, 1)}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='font-bold'>{user.displayName}</p>
          <span className={`${badge} mt-1 bg-slate-100 text-slate-700`}>{roleLabels[user.role]}</span>
        </div>
        <form action={logoutAction}>
          <button className={button('secondary')}>ログアウト</button>
        </form>
      </section>

      <section className={`${card} space-y-4 p-5`}>
        <div>
          <h2 className='font-bold'>ログインに使う端末（パスキー）</h2>
          <p className='mt-1 text-sm leading-6 text-slate-600'>
            iPhone・MacのiCloudキーチェーンやGoogleパスワードマネージャーに保存したパスキーは、同じアカウントの端末でも使えます。
          </p>
        </div>
        <PasskeyList passkeys={passkeys} self />
        <div className='border-t border-slate-100 pt-4'>
          <p className='mb-3 text-sm text-slate-600'>
            機種変更や別のPCでもログインしたいときは、リンクを発行して、その端末で開いてください（7日間有効）。
          </p>
          <LinkButton label='端末を追加するリンクを発行' note='追加したい端末でこのリンクを開いてください。' create={addDevice} />
        </div>
      </section>
    </div>
  );
}
